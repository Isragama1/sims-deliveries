import { DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Activacion, Entrega } from '../../core/models';

@Component({
  selector: 'app-cliente-detalle',
  imports: [DatePipe, RouterLink],
  templateUrl: './cliente-detalle.html',
  styleUrl: './cliente-detalle.scss',
})
export class ClienteDetalle {
  private data = inject(DataService);

  /** Viene de la ruta /clientes/:id (withComponentInputBinding). */
  readonly id = input.required<string>();

  // Datos base cacheados
  private readonly clientesBase = toSignal(this.data.clientes$(), { initialValue: [] as any[] });
  private readonly activacionesBase = toSignal(this.data.activaciones$(), { initialValue: [] as Activacion[] });
  private readonly entregasBase = toSignal(this.data.entregas$(), { initialValue: [] as Entrega[] });

  // Public computed signals for template
  readonly cliente = computed(() => this.clientesBase().find(c => c.id === this.id()) ?? null);

  readonly sims = computed(() =>
    this.activacionesBase().filter(a => a.clienteId === this.id())
  );

  readonly entregas = computed(() =>
    this.entregasBase().filter(e => e.clienteId === this.id())
  );
}