import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Cliente } from '../../core/models';

interface Grupo {
  colonia: string;
  clientes: Cliente[];
}

@Component({
  selector: 'app-ruta',
  imports: [DatePipe, RouterLink],
  templateUrl: './ruta.html',
  styleUrl: './ruta.scss',
})
export class Ruta {
  private data = inject(DataService);

  readonly clientes = toSignal(this.data.clientes$(), { initialValue: [] as Cliente[] });

  readonly grupos = computed<Grupo[]>(() => {
    const mapa = new Map<string, Cliente[]>();
    for (const c of this.clientes()) {
      if (c.tipo === 'generico') continue; // excluye PORTABILIDADES
      const col = c.colonia ?? 'SIN COLONIA';
      if (!mapa.has(col)) mapa.set(col, []);
      mapa.get(col)!.push(c);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([colonia, clientes]) => ({ colonia, clientes }));
  });

  readonly visitadosHoy = computed(
    () => this.clientes().filter((c) => this.esHoy(c)).length,
  );

  esHoy(c: Cliente): boolean {
    const t = c.ultimaVisita;
    if (!t) return false;
    const d = t.toDate();
    const hoy = new Date();
    return (
      d.getFullYear() === hoy.getFullYear() &&
      d.getMonth() === hoy.getMonth() &&
      d.getDate() === hoy.getDate()
    );
  }

  async marcarVisita(c: Cliente): Promise<void> {
    await this.data.marcarVisita(c.id);
  }

  mapsUrl(c: Cliente): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.domicilio ?? '')}`;
  }
}
