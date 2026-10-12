import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Observable, combineLatest, map } from 'rxjs';
import { Activacion, Cliente, Entrega, Venta } from './models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private db = inject(Firestore);

  /** Todas las SIMs (activaciones + stock). */
  activaciones$(): Observable<Activacion[]> {
    const ref = collection(this.db, 'activaciones');
    return collectionData(ref, { idField: 'iccid' }) as Observable<Activacion[]>;
  }

  /** SIMs filtradas por estatus ('activado' | 'en_stock'). */
  activacionesPorEstatus$(estatus: Activacion['estatus']): Observable<Activacion[]> {
    const ref = query(collection(this.db, 'activaciones'), where('estatus', '==', estatus));
    return collectionData(ref, { idField: 'iccid' }) as Observable<Activacion[]>;
  }

  /** Actualiza campos de una activación (ICCID es el ID del documento). */
  actualizarActivacion(iccid: string, datos: Partial<Activacion>): Promise<void> {
    return updateDoc(doc(this.db, 'activaciones', iccid), datos);
  }

  /** Actualiza múltiples activaciones en lote (batch). */
  actualizarActivacionesLote(
    cambios: Array<{ iccid: string; datos: Partial<Activacion> }>,
  ): Promise<void> {
    const batch = writeBatch(this.db);
    for (const c of cambios) {
      batch.update(doc(this.db, 'activaciones', c.iccid), c.datos);
    }
    return batch.commit();
  }

  clientes$(): Observable<Cliente[]> {
    const ref = query(collection(this.db, 'clientes'), orderBy('nombre'));
    return collectionData(ref) as Observable<Cliente[]>;
  }

  cliente$(id: string): Observable<Cliente | undefined> {
    return docData(doc(this.db, 'clientes', id)) as Observable<Cliente | undefined>;
  }

  entregas$(): Observable<Entrega[]> {
    const ref = collection(this.db, 'entregas');
    return collectionData(ref, { idField: 'iccid' }) as Observable<Entrega[]>;
  }

  /** SIMs asignadas a un cliente. */
  activacionesPorCliente$(clienteId: string): Observable<Activacion[]> {
    const ref = query(collection(this.db, 'activaciones'), where('clienteId', '==', clienteId));
    return collectionData(ref, { idField: 'iccid' }) as Observable<Activacion[]>;
  }

  /** Entregas registradas a un cliente. */
  entregasPorCliente$(clienteId: string): Observable<Entrega[]> {
    const ref = query(collection(this.db, 'entregas'), where('clienteId', '==', clienteId));
    return collectionData(ref, { idField: 'iccid' }) as Observable<Entrega[]>;
  }

  /** Marca visita de hoy al cliente. */
  marcarVisita(clienteId: string): Promise<void> {
    return updateDoc(doc(this.db, 'clientes', clienteId), { ultimaVisita: serverTimestamp() });
  }

  /** Registra una venta (una o varias SIMs) y actualiza cada SIM. */
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
    await Promise.all(
      venta.iccids.map((iccid) => updateDoc(doc(this.db, 'activaciones', iccid), cambios)),
    );
  }

  /** Historial de ventas/entregas (más recientes primero). */
  ventas$(): Observable<Venta[]> {
    const ref = query(collection(this.db, 'ventas'));
    return collectionData(ref, { idField: 'id' }) as Observable<Venta[]>;
  }

  /** Entregas usando la colección 'entregas' (fecha por ICCID) enriquecidas con marca. */
  colocaciones$(): Observable<Array<{ iccid: string; marca: string; clienteNombre: string; vendedor: string; fecha: Date }>> {
    return combineLatest([
      this.entregas$(),
      this.activaciones$(),
    ]).pipe(
      map(([entregas, activaciones]) => {
        const mapaActivaciones = new Map(activaciones.map(a => [a.iccid, a.marca]));
        return entregas
          .map(e => ({
            iccid: e.iccid,
            marca: mapaActivaciones.get(e.iccid) ?? 'SIN MARCA',
            clienteNombre: e.clienteNombre ?? 'SIN CLIENTE',
            vendedor: '', // no hay vendedor en entregas
            fecha: e.fechaEntrega?.toDate?.() ?? new Date(),
          }))
          .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
      })
    );
  }

  /** Alta de cliente con ID consecutivo (max id numérico + 1). */
  async crearCliente(datos: Omit<Cliente, 'id'>): Promise<string> {
    const snap = await getDocs(collection(this.db, 'clientes'));
    const maxId = snap.docs.reduce((max, d) => {
      const n = parseInt(d.id, 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const id = String(maxId + 1);
    await setDoc(doc(this.db, 'clientes', id), { id, ...datos });
    return id;
  }

  /** Edición de cliente existente. */
  actualizarCliente(id: string, datos: Partial<Omit<Cliente, 'id'>>): Promise<void> {
    return updateDoc(doc(this.db, 'clientes', id), datos);
  }
}
