import { Injectable, inject, signal, computed } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  orderBy,
} from '@angular/fire/firestore';
import { Observable, combineLatest, map, take } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { Activacion, Cliente, Entrega, Venta } from './models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private db = inject(Firestore);

  // ===== CACHED SIGNALS (load once, reuse everywhere) =====
  private _activaciones = signal<Activacion[]>([]);
  private _activacionesLoaded = signal(false);
  private _clientes = signal<Cliente[]>([]);
  private _clientesLoaded = signal(false);
  private _entregas = signal<Entrega[]>([]);
  private _entregasLoaded = signal(false);

  readonly activaciones = computed(() => this._activaciones());
  readonly clientes = computed(() => this._clientes());
  readonly entregas = computed(() => this._entregas());

  // ===== LAZY LOADERS =====
  /** Carga activaciones si no están cargadas. */
  async ensureActivaciones(): Promise<void> {
    if (this._activacionesLoaded()) return;
    await this.loadActivaciones();
  }

  /** Carga clientes si no están cargados. */
  async ensureClientes(): Promise<void> {
    if (this._clientesLoaded()) return;
    await this.loadClientes();
  }

  /** Carga entregas si no están cargadas. */
  async ensureEntregas(): Promise<void> {
    if (this._entregasLoaded()) return;
    await this.loadEntregas();
  }

  private async loadActivaciones(): Promise<void> {
    await new Promise<void>((resolve) => {
      collectionData(collection(this.db, 'activaciones'), { idField: 'iccid' })
        .pipe(take(1))
        .subscribe({
          next: (data) => {
            this._activaciones.set(data as Activacion[]);
            this._activacionesLoaded.set(true);
            resolve();
          },
          error: () => {
            this._activacionesLoaded.set(true);
            resolve();
          },
        });
    });
  }

  private async loadClientes(): Promise<void> {
    await new Promise<void>((resolve) => {
      collectionData(query(collection(this.db, 'clientes'), orderBy('nombre')))
        .pipe(take(1))
        .subscribe({
          next: (data) => {
            this._clientes.set(data as Cliente[]);
            this._clientesLoaded.set(true);
            resolve();
          },
          error: () => {
            this._clientesLoaded.set(true);
            resolve();
          },
        });
    });
  }

  private async loadEntregas(): Promise<void> {
    await new Promise<void>((resolve) => {
      collectionData(collection(this.db, 'entregas'), { idField: 'iccid' })
        .pipe(take(1))
        .subscribe({
          next: (data) => {
            this._entregas.set(data as Entrega[]);
            this._entregasLoaded.set(true);
            resolve();
          },
          error: () => {
            this._entregasLoaded.set(true);
            resolve();
          },
        });
    });
  }

  // ===== OBSERVABLES (for real-time if needed) =====
  /** Observable en tiempo real de activaciones. */
  activaciones$(): Observable<Activacion[]> {
    return collectionData(collection(this.db, 'activaciones'), { idField: 'iccid' }) as Observable<Activacion[]>;
  }

  /** Observable en tiempo real de clientes. */
  clientes$(): Observable<Cliente[]> {
    return collectionData(query(collection(this.db, 'clientes'), orderBy('nombre'))) as Observable<Cliente[]>;
  }

  /** Observable en tiempo real de entregas. */
  entregas$(): Observable<Entrega[]> {
    return collectionData(collection(this.db, 'entregas'), { idField: 'iccid' }) as Observable<Entrega[]>;
  }

  /** Observable en tiempo real de ventas. */
  ventas$(): Observable<Venta[]> {
    return collectionData(collection(this.db, 'ventas')) as Observable<Venta[]>;
  }

  // ===== CLIENTE SINGLE =====
  cliente$(id: string): Observable<Cliente | undefined> {
    return docData(doc(this.db, 'clientes', id)) as Observable<Cliente | undefined>;
  }

  // ===== MUTATIONS =====
  /** Actualiza una activación. */
  actualizarActivacion(iccid: string, datos: Partial<Activacion>): Promise<void> {
    return updateDoc(doc(this.db, 'activaciones', iccid), datos);
  }

  /** Actualiza múltiples activaciones en lote. */
  actualizarActivacionesLote(cambios: Array<{ iccid: string; datos: Partial<Activacion> }>): Promise<void> {
    const batch = writeBatch(this.db);
    for (const c of cambios) batch.update(doc(this.db, 'activaciones', c.iccid), c.datos);
    return batch.commit();
  }

  /** Marca visita de hoy. */
  marcarVisita(clienteId: string): Promise<void> {
    return updateDoc(doc(this.db, 'clientes', clienteId), { ultimaVisita: serverTimestamp() });
  }

  /** Registra venta y actualiza SIMs. */
  async registrarVenta(
    venta: Omit<Venta, 'id' | 'fecha' | 'iccid'> & { iccids: string[] },
    opciones: { marcarActivada: boolean },
  ): Promise<void> {
    await addDoc(collection(this.db, 'ventas'), { ...venta, fecha: serverTimestamp() });
    const cambios: Record<string, unknown> = {
      clienteId: venta.clienteId,
      clienteNombre: venta.clienteNombre,
    };
    if (opciones.marcarActivada) {
      cambios['estatus'] = 'activado';
      cambios['fechaActivacionBase'] = serverTimestamp();
    }
    await Promise.all(venta.iccids.map((iccid) => updateDoc(doc(this.db, 'activaciones', iccid), cambios)));
    // Invalidar cache local para próxima carga
    this._activacionesLoaded.set(false);
  }

  /** Crea cliente con ID auto. */
  async crearCliente(datos: Omit<Cliente, 'id'>): Promise<string> {
    const snap = await getDocs(collection(this.db, 'clientes'));
    const maxId = snap.docs.reduce((max, d) => {
      const n = parseInt(d.id, 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const id = String(maxId + 1);
    await setDoc(doc(this.db, 'clientes', id), { id, ...datos });
    this._clientesLoaded.set(false); // invalidar cache
    return id;
  }

  /** Actualiza cliente. */
  actualizarCliente(id: string, datos: Partial<Omit<Cliente, 'id'>>): Promise<void> {
    this._clientesLoaded.set(false);
    return updateDoc(doc(this.db, 'clientes', id), datos);
  }

  // ===== COMPUTED VIEWS (client-side, zero extra reads) =====
  /** Mapa ICCID -> marca para enriquecer entregas sin query extra. */
  private _marcaMap = computed(() => new Map(this._activaciones().map(a => [a.iccid, a.marca])));

  /** Entregas enriquecidas con marca (client-side join). */
  entregasConMarca = computed(() =>
    this._entregas().map(e => ({
      iccid: e.iccid,
      marca: this._marcaMap().get(e.iccid) ?? 'SIN MARCA',
      clienteNombre: e.clienteNombre ?? 'SIN CLIENTE',
      vendedor: '',
      fecha: e.fechaEntrega?.toDate?.() ?? new Date(),
    })).sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
  );

  /** Activaciones filtradas por cliente (client-side). */
  activacionesPorCliente(clienteId: string) {
    return computed(() => this._activaciones().filter(a => a.clienteId === clienteId));
  }

  /** Entregas filtradas por cliente (client-side). */
  entregasPorCliente(clienteId: string) {
    return computed(() => this._entregas().filter(e => e.clienteId === clienteId));
  }
}