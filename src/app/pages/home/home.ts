import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { GeoService } from '../../core/geo.service';

@Component({
  selector: 'app-home',
  imports: [AsyncPipe, RouterLink],
  template: `
    @if (geo.estado() === 'concedido' && geo.gpsActivo()) {
      <header class="topbar">
        <h1>Ruta Colocación</h1>
        <button (click)="logout()">Cerrar sesión</button>
      </header>
      <main class="content">
        @if (auth.user$ | async; as u) {
          <p class="saludo">
            Bienvenido, <strong>{{ u.displayName || u.email }}</strong>
          </p>
        }
        <nav class="menu">
          <a routerLink="/stock" class="modulo">
            <span class="icono">📦</span>
            <span class="titulo">Stock</span>
            <span class="desc">SIMs en inventario y activadas</span>
          </a>
          <a routerLink="/clientes" class="modulo">
            <span class="icono">👥</span>
            <span class="titulo">Clientes</span>
            <span class="desc">Directorio y SIMs por cliente</span>
          </a>
          <a routerLink="/ruta" class="modulo">
            <span class="icono">🗺️</span>
            <span class="titulo">Ruta</span>
            <span class="desc">Visitas del día por colonia</span>
          </a>
          <a routerLink="/venta" class="modulo">
            <span class="icono">📲</span>
            <span class="titulo">Entregas</span>
            <span class="desc">Registrar entregas de SIMs</span>
          </a>
          <a routerLink="/estadisticas" class="modulo">
            <span class="icono">📊</span>
            <span class="titulo">Estadísticas</span>
            <span class="desc">Activaciones por mes, marca, cliente</span>
          </a>
        </nav>
      </main>
    } @else {
      <div class="gps-bloqueo">
        <div class="gps-icon">📍</div>
        <h2>Ubicación requerida</h2>
        <p>
          Esta app necesita acceso a tu ubicación GPS para registrar entregas y mostrar tu ruta.
        </p>
        <ul class="pasos">
          @if (geo.estado() === 'denegado') {
            <li>Activa el permiso de ubicación en la configuración del navegador.</li>
            <li>Recarga la página o pulsa "Reintentar" abajo.</li>
          } @else if (geo.estado() === 'no-disponible') {
            <li>Tu navegador no soporta geolocalización.</li>
          } @else {
            <li>Esperando permiso del navegador…</li>
            <li>Si no aparece el aviso, revisa el icono de candado en la barra de direcciones.</li>
          }
        </ul>
        <button class="btn-reintentar" (click)="reintentarGps()">Reintentar</button>
      </div>
    }
  `,
  styles: `
    :host { display: block; min-height: 100dvh; background: #f4f6f8; }
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1.25rem;
      background: #2c5364;
      color: #fff;
      h1 { margin: 0; font-size: 1.1rem; }
      button {
        border: 1px solid rgba(255,255,255,0.5);
        background: transparent;
        color: #fff;
        border-radius: 8px;
        padding: 0.4rem 0.8rem;
        cursor: pointer;
      }
    }
    .content { padding: 1.5rem 1.25rem; }
    .saludo { margin: 0 0 1rem; color: #37474f; }
    .menu {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.75rem;
    }
    .modulo {
      display: grid;
      gap: 0.2rem;
      background: #fff;
      border-radius: 14px;
      padding: 1rem;
      text-decoration: none;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      .icono { font-size: 1.6rem; }
      .titulo { font-weight: 700; color: #15303f; }
      .desc { font-size: 0.78rem; color: #6b7a85; }
    }

    .gps-bloqueo {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      text-align: center;
      background: linear-gradient(180deg, #f5f9ff 0%, #eef4fb 100%);
    }
    .gps-icon { font-size: 4rem; margin-bottom: 1rem; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
    h2 { margin: 0 0 0.5rem; color: #1a237e; font-size: 1.6rem; }
    p { margin: 0 0 1.5rem; color: #37474f; max-width: 320px; line-height: 1.5; }
    .pasos { list-style: none; padding: 0; margin: 0 0 2rem; text-align: left; max-width: 320px; }
    .pasos li { padding: 0.4rem 0 0.4rem 1.5rem; position: relative; color: #455a64; font-size: 0.95rem; }
    .pasos li::before { content: '•'; position: absolute; left: 0; color: #1976d2; font-weight: bold; }
    .btn-reintentar {
      padding: 0.9rem 2.5rem;
      border-radius: 30px;
      border: none;
      background: #1976d2;
      color: white;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(25,118,210,0.3);
      transition: background 0.2s, transform 0.1s;
    }
    .btn-reintentar:hover { background: #1565c0; }
    .btn-reintentar:active { transform: scale(0.98); }
  `,
})
export class Home {
  readonly auth = inject(AuthService);
  readonly geo = inject(GeoService);
  private router = inject(Router);

  constructor() {
    this.geo.solicitarPermiso();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  reintentarGps(): void {
    this.geo.reintentar();
  }
}