import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Cliente, Activacion } from '../../core/models';

interface ClienteConStats extends Cliente {
  sims: number;
  stockPorMarca: { marca: string; cantidad: number }[];
  stockBajo: boolean;
}

const MARCAS = ['ATT', 'UNEFON', 'TELCEL', 'MOVISTAR'] as const;
type Marca = (typeof MARCAS)[number];

function esMarca(marca: string): marca is Marca {
  return MARCAS.some((item) => item === marca);
}

@Component({
  selector: 'app-clientes',
  imports: [FormsModule, RouterLink],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class Clientes {
  private data = inject(DataService);

  readonly busqueda = signal('');

  // Usa datos cacheados del servicio (client-side join, zero extra reads)
  private readonly clientesBase = toSignal(this.data.clientes$(), { initialValue: [] as Cliente[] });
  private readonly activaciones = toSignal(this.data.activaciones$(), { initialValue: [] as Activacion[] });

  readonly clientes = computed<ClienteConStats[]>(() => {
    const clientes = this.clientesBase();
    const acts = this.activaciones();
    const mapa = new Map<
      string,
      { sims: number; stockPorMarca: Record<Marca, number> }
    >();
    for (const a of acts) {
      if (!a.clienteId) continue;
      const m = mapa.get(a.clienteId) ?? {
        sims: 0,
        stockPorMarca: { ATT: 0, UNEFON: 0, TELCEL: 0, MOVISTAR: 0 },
      };
      if (a.estatus === 'en_stock') {
        m.sims++;
        const marca = a.marca?.trim().toLocaleUpperCase();
        if (marca && esMarca(marca)) {
          m.stockPorMarca[marca]++;
        }
      }
      mapa.set(a.clienteId, m);
    }
    return clientes.map((c) => {
      const stockPorMarca = MARCAS.map((marca) => ({
        marca,
        cantidad: mapa.get(c.id)?.stockPorMarca[marca] ?? 0,
      }));
      return {
        ...c,
        sims: mapa.get(c.id)?.sims ?? 0,
        stockPorMarca,
        stockBajo: stockPorMarca.some(({ cantidad }) => cantidad <= 2),
      };
    });
  });

  readonly filtrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    if (!q) return this.clientes();
    return this.clientes().filter((c) =>
      `${c.nombre} ${c.colonia ?? ''} ${c.domicilio ?? ''} ${c.telefono ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  });
}