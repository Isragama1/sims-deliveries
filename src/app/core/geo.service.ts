import { Injectable, signal } from '@angular/core';

export interface Ubicacion {
  lat: number;
  lng: number;
  precision: number;
}

export type GeoEstado = 'pendiente' | 'concedido' | 'denegado' | 'no-disponible';

/**
 * Servicio de geolocalización (app web en Firebase Hosting).
 * Pide el permiso una sola vez al inicio; el navegador lo recuerda
 * y las entregas posteriores obtienen la ubicación sin volver a preguntar.
 * Bloquea el acceso a la app si no hay permiso de ubicación.
 */
@Injectable({ providedIn: 'root' })
export class GeoService {
  readonly estado = signal<GeoEstado>('pendiente');
  readonly gpsActivo = signal(false);

  private ultima: { ubicacion: Ubicacion; ts: number } | null = null;

  /** Pide permiso al arrancar y precalienta la primera lectura de GPS. */
  solicitarPermiso(): void {
    if (!('geolocation' in navigator)) {
      this.estado.set('no-disponible');
      this.gpsActivo.set(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.estado.set('concedido');
        this.gpsActivo.set(true);
        this.guardar(pos);
      },
      (err) => {
        this.estado.set(err.code === err.PERMISSION_DENIED ? 'denegado' : 'pendiente');
        this.gpsActivo.set(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  /** Reintenta obtener permiso (ej. tras activar GPS en ajustes). */
  reintentar(): void {
    this.estado.set('pendiente');
    this.solicitarPermiso();
  }

  /**
   * Ubicación actual para registrar una entrega.
   * Usa la última lectura si tiene menos de 2 minutos; si no, pide una nueva.
   * Devuelve null si no hay permiso o falla.
   */
  obtenerUbicacion(): Promise<Ubicacion | null> {
    const DOS_MIN = 2 * 60 * 1000;
    if (this.ultima && Date.now() - this.ultima.ts < DOS_MIN) {
      return Promise.resolve(this.ultima.ubicacion);
    }
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.estado.set('concedido');
          this.gpsActivo.set(true);
          resolve(this.guardar(pos));
        },
        () => resolve(this.ultima?.ubicacion ?? null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }

  private guardar(pos: GeolocationPosition): Ubicacion {
    const u: Ubicacion = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      precision: Math.round(pos.coords.accuracy),
    };
    this.ultima = { ubicacion: u, ts: Date.now() };
    return u;
  }
}
