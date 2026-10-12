import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Activacion } from '../../core/models';

type FiltroEstatus = 'todos' | 'en_stock' | 'activado';
type FiltroMarca = 'todas' | 'ATT' | 'UNEFON' | 'TELCEL' | 'MOVISTAR';

@Component({
  selector: 'app-stock',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './stock.html',
  styleUrl: './stock.scss',
})
export class Stock {
  private data = inject(DataService);

  readonly todas = toSignal(this.data.activaciones$(), { initialValue: [] as Activacion[] });

  readonly filtroEstatus = signal<FiltroEstatus>('todos');
  readonly filtroMarca = signal<FiltroMarca>('todas');
  readonly busqueda = signal('');

  readonly totales = computed(() => {
    const t = this.todas();
    return {
      total: t.length,
      enStock: t.filter((a) => a.estatus === 'en_stock').length,
      activadas: t.filter((a) => a.estatus === 'activado').length,
    };
  });

  readonly porMarca = computed(() => {
    const mapa = new Map<string, number>();
    for (const a of this.todas()) {
      const m = a.marca ?? 'OTRA';
      mapa.set(m, (mapa.get(m) ?? 0) + 1);
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b));
  });

  readonly filtradas = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    return this.todas().filter((a) => {
      if (this.filtroEstatus() !== 'todos' && a.estatus !== this.filtroEstatus()) return false;
      if (this.filtroMarca() !== 'todas' && a.marca !== this.filtroMarca()) return false;
      if (q) {
        const texto = `${a.iccid} ${a.dn ?? ''} ${a.clienteNombre ?? ''}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  });
}
