import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Activacion } from '../../core/models';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs';

type Tab = 'activaciones' | 'entregas';

type SortDir = 'asc' | 'desc' | null;
type SortKey = 'iccid' | 'marca' | 'dn' | 'cliente' | 'fecha';

interface Item { iccid: string; marca: string; dn: string; cliente: string; fecha: Date; }
interface MesData { mes: string; total: number; items: Item[]; marcas: Map<string, number>; }

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.scss',
})
export class Estadisticas {
  private data = inject(DataService);

  readonly tab = signal<Tab>('activaciones');
  readonly mesDetalle = signal<string | null>(null);
  readonly sortAct = signal<{ key: SortKey; dir: SortDir }>({ key: 'fecha', dir: 'desc' });
  readonly sortEnt = signal<{ key: SortKey; dir: SortDir }>({ key: 'fecha', dir: 'desc' });
  readonly sortMes = signal<{ key: SortKey; dir: SortDir }>({ key: 'fecha', dir: 'desc' });

  // Lazy-loaded data signals - only populated when tab is visited
  readonly activacionesData = signal<Activacion[]>([]);
  readonly entregasData = signal<any[]>([]);
  readonly activacionesLoaded = signal(false);
  readonly entregasLoaded = signal(false);

  // Load data when tab changes
  constructor() {
    effect(() => {
      if (this.tab() === 'activaciones' && !this.activacionesLoaded()) {
        this.cargarActivaciones();
      }
      if (this.tab() === 'entregas' && !this.entregasLoaded()) {
        this.cargarEntregas();
      }
    });
  }

  private cargarActivaciones(): void {
    this.data.activaciones$().subscribe({
      next: (acts) => {
        this.activacionesData.set(acts);
        this.activacionesLoaded.set(true);
      },
      error: () => this.activacionesLoaded.set(true),
    });
  }

  private cargarEntregas(): void {
    this.data.entregas$().subscribe({
      next: (ents) => {
        this.entregasData.set(ents);
        this.entregasLoaded.set(true);
      },
      error: () => this.entregasLoaded.set(true),
    });
  }

  // ===== ACTIVACIONES =====
  readonly activacionesList = computed<Item[]>(() => {
    const { key, dir } = this.sortAct();
    let list = this.activacionesData()
      .filter(a => a.estatus === 'activado')
      .map(a => ({
        iccid: a.iccid,
        marca: a.marca ?? 'SIN MARCA',
        dn: a.dn ?? '',
        cliente: a.clienteNombre ?? 'SIN CLIENTE',
        fecha: a.fechaActivacionBase?.toDate() ?? a.activacion?.fechaActivacion?.toDate() ?? new Date(),
      }));
    if (key && dir) list = this.sortList(list, key, dir);
    return list;
  });

  readonly mesesAct = computed<MesData[]>(() => this.buildAllMeses(this.activacionesList()));
  readonly mesSelAct = computed(() => this.getMesSeleccionado(this.mesesAct()));

  // ===== ENTREGAS =====
  readonly entregasList = computed<Item[]>(() => {
    const { key, dir } = this.sortEnt();
    const mapaActivaciones = new Map(this.activacionesData().map(a => [a.iccid, a.marca]));
    let list = this.entregasData().map(e => ({
      iccid: e.iccid,
      marca: mapaActivaciones.get(e.iccid) ?? 'SIN MARCA',
      dn: '',
      cliente: e.clienteNombre ?? 'SIN CLIENTE',
      fecha: e.fechaEntrega?.toDate?.() ?? new Date(),
    }));
    if (key && dir) list = this.sortList(list, key, dir);
    return list;
  });

  readonly mesesEnt = computed<MesData[]>(() => this.buildAllMeses(this.entregasList()));
  readonly mesSelEnt = computed(() => this.getMesSeleccionado(this.mesesEnt()));

  private buildAllMeses(list: Item[]): MesData[] {
    const mapa = new Map<string, Item[]>();
    for (const item of list) {
      const fecha = item.fecha;
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const arr = mapa.get(key) ?? [];
      arr.push(item);
      mapa.set(key, arr);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([mes, items]) => {
        const marcas = new Map<string, number>();
        for (const a of items) {
          const m = a.marca ?? 'SIN MARCA';
          marcas.set(m, (marcas.get(m) ?? 0) + 1);
        }
        return { mes, total: items.length, items, marcas };
      });
  }

  private getMesSeleccionado(meses: MesData[]): MesData | undefined {
    const { key, dir } = this.sortMes();
    const m = meses.find(m => m.mes === this.mesDetalle());
    if (!m || !key || !dir) return m;
    return { ...m, items: [...m.items].sort((a, b) => this.compare(a, b, key, dir)) };
  }

  private sortList(list: Item[], key: SortKey, dir: SortDir): Item[] {
    return [...list].sort((a, b) => this.compare(a, b, key, dir));
  }

  private compare(a: Item, b: Item, key: SortKey, dir: SortDir): number {
    const av = a[key as keyof Item];
    const bv = b[key as keyof Item];
    const aVal = av instanceof Date ? av.getTime() : String(av ?? '');
    const bVal = bv instanceof Date ? bv.getTime() : String(bv ?? '');
    if (aVal < bVal) return dir === 'asc' ? -1 : 1;
    if (aVal > bVal) return dir === 'asc' ? 1 : -1;
    return 0;
  }

  toggleSortAct(key: SortKey): void { this.toggle(this.sortAct, key); }
  toggleSortEnt(key: SortKey): void { this.toggle(this.sortEnt, key); }
  toggleSortMes(key: SortKey): void { this.toggle(this.sortMes, key); }

  private toggle(sig: any, key: SortKey): void {
    const { key: k, dir } = sig();
    if (k === key) sig.set({ key, dir: dir === 'asc' ? 'desc' : dir === 'desc' ? null : 'asc' });
    else sig.set({ key, dir: 'asc' });
  }

  sortIcon(key: string, current: { key: string; dir: SortDir }): string {
    if (current.key !== key) return '⇅';
    return current.dir === 'asc' ? '▲' : current.dir === 'desc' ? '▼' : '⇅';
  }

  formatoMes(mes: string): string {
    const [y, m] = mes.split('-');
    const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${nombres[parseInt(m,10)-1]} ${y}`;
  }

  marcaCount(mes: MesData | undefined, marca: string): number {
    return mes?.marcas.get(marca) ?? 0;
  }

  verDetalleMes(mes: string): void {
    const valor = mes === '' ? null : mes;
    this.mesDetalle.set(this.mesDetalle() === valor ? null : valor);
  }
}