import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/data.service';
import { Activacion } from '../../core/models';

type Tab = 'activaciones' | 'entregas';

type SortDir = 'asc' | 'desc' | null;
type SortKey = 'iccid' | 'marca' | 'dn' | 'cliente' | 'fecha';

interface StatCard { label: string; value: string | number; color: string; }
interface Item { iccid: string; marca: string; dn: string; cliente: string; fecha: Date; }
interface MesData { mes: string; total: number; items: Item[]; marcas: Map<string, number>; }

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule],
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

  readonly activaciones = toSignal(this.data.activaciones$(), { initialValue: [] as Activacion[] });
  readonly entregasRaw = toSignal(this.data.entregas$(), { initialValue: [] as any[] });

  // ===== ACTIVACIONES =====
  readonly activacionesList = computed<Item[]>(() => {
    const { key, dir } = this.sortAct();
    let list = this.activaciones()
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

  readonly ultimos3MesesAct = computed<MesData[]>(() => this.buildMeses(this.activacionesList()));

  readonly tarjetasAct = computed<StatCard[]>(() => [
    { label: 'Total activadas', value: this.activacionesList().length, color: '#2e7d32' },
    { label: 'Últimos 3 meses', value: this.ultimos3MesesAct().reduce((s, m) => s + m.total, 0), color: '#1565c0' },
  ]);

  readonly mesSelAct = computed(() => this.getMesSeleccionado(this.ultimos3MesesAct()));

  // ===== ENTREGAS =====
  readonly entregasList = computed<Item[]>(() => {
    const { key, dir } = this.sortEnt();
    const mapaActivaciones = new Map(this.activaciones().map(a => [a.iccid, a.marca]));
    let list = this.entregasRaw().map(e => ({
      iccid: e.iccid,
      marca: mapaActivaciones.get(e.iccid) ?? 'SIN MARCA',
      dn: '',
      cliente: e.clienteNombre ?? 'SIN CLIENTE',
      fecha: e.fechaEntrega?.toDate?.() ?? new Date(),
    }));
    if (key && dir) list = this.sortList(list, key, dir);
    return list;
  });

  readonly ultimos3MesesEnt = computed<MesData[]>(() => this.buildMeses(this.entregasList()));

  readonly tarjetasEnt = computed<StatCard[]>(() => [
    { label: 'Total entregadas', value: this.entregasList().length, color: '#2c5364' },
    { label: 'Últimos 3 meses', value: this.ultimos3MesesEnt().reduce((s, m) => s + m.total, 0), color: '#1565c0' },
  ]);

  readonly mesSelEnt = computed(() => this.getMesSeleccionado(this.ultimos3MesesEnt()));

  private buildMeses(list: Item[]): MesData[] {
    const ahora = new Date();
    const meses: MesData[] = [];
    for (let i = 0; i < 3; i++) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      const inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59);
      const items = list.filter(a => a.fecha >= inicio && a.fecha <= fin);
      const marcas = new Map<string, number>();
      for (const a of items) {
        const m = a.marca ?? 'SIN MARCA';
        marcas.set(m, (marcas.get(m) ?? 0) + 1);
      }
      meses.push({ mes: key, total: items.length, items, marcas });
    }
    return meses;
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

  verDetalleMes(mes: string): void {
    this.mesDetalle.set(this.mesDetalle() === mes ? null : mes);
  }
}