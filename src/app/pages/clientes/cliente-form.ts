import { Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { doc, docData, Firestore } from '@angular/fire/firestore';
import { take } from 'rxjs';
import { DataService } from '../../core/data.service';
import { Cliente } from '../../core/models';

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './cliente-form.html',
  styleUrl: './cliente-form.scss',
})
export class ClienteForm {
  private fb = inject(FormBuilder);
  private data = inject(DataService);
  private db = inject(Firestore);
  private router = inject(Router);

  /** Si viene id por la ruta, es edición; si no, alta. */
  readonly id = input<string>();

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    colonia: [''],
    domicilio: [''],
    telefono: ['', [Validators.pattern(/^\d{10}$/)]],
  });

  get esEdicion(): boolean {
    return !!this.id();
  }

  constructor() {
    effect(() => {
      const id = this.id();
      if (!id) return;
      (docData(doc(this.db, 'clientes', id)) as unknown as import('rxjs').Observable<Cliente>)
        .pipe(take(1))
        .subscribe((c) => {
          if (!c) return;
          this.form.patchValue({
            nombre: c.nombre ?? '',
            colonia: c.colonia ?? '',
            domicilio: c.domicilio ?? '',
            telefono: c.telefono ?? '',
          });
        });
    });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const datos = {
      nombre: v.nombre.trim().toUpperCase(),
      colonia: v.colonia.trim().toUpperCase() || null,
      domicilio: v.domicilio.trim() || null,
      telefono: v.telefono.trim() || null,
    };
    this.guardando.set(true);
    this.error.set(null);
    try {
      if (this.esEdicion) {
        await this.data.actualizarCliente(this.id()!, datos);
        this.router.navigate(['/clientes', this.id()]);
      } else {
        const nuevoId = await this.data.crearCliente(datos);
        this.router.navigate(['/clientes', nuevoId]);
      }
    } catch {
      this.error.set('No se pudo guardar. Intenta de nuevo.');
    } finally {
      this.guardando.set(false);
    }
  }
}
