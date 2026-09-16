import { Component, ElementRef, NgZone, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ParticleCanvasComponent } from '../shared/components/particle-canvas/particle-canvas.component';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
        [key: string]: unknown;
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
      prompt?: () => void;
    };
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ParticleCanvasComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('googleBtn') googleBtnHost!: ElementRef<HTMLDivElement>;

  username = '';
  password = '';
  loading = false;
  errorMessage = '';
  sessionExpiredMessage = '';

  clientId: string | null = null;
  isGoogleConfigured = false;
  showConfigNotice = false;
  private isViewInitialized = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Muestra el mensaje de sesión (expirada, cerrada, etc.) y luego lo limpia
    this.sessionExpiredMessage = this.authService.sessionMessage();
    this.authService.clearSessionMessage();
    this.fetchGoogleConfig();
  }

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    if (this.clientId && this.isGoogleConfigured) {
      this.initGoogleOfficialButton();
    }
  }

  dismissSessionMessage(): void {
    this.sessionExpiredMessage = '';
  }

  onSubmit(form: NgForm): void {
    if (form.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.username, this.password).subscribe({
      next: (result) => {
        this.loading = false;
        if (result.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = result.message;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'No se pudo conectar al servidor. Verifica que el backend esté corriendo.';
      }
    });
  }

  private fetchGoogleConfig(): void {
    this.authService.getGoogleClientId().subscribe({
      next: (config) => {
        const id = config?.clientId?.trim() || null;
        this.clientId = id;

        if (id && id.toLowerCase() !== 'demo') {
          this.isGoogleConfigured = true;
          if (this.isViewInitialized) {
            this.initGoogleOfficialButton();
          }
        } else {
          this.isGoogleConfigured = false;
        }
      },
      error: () => {
        console.warn('No se pudo obtener la configuración de Google desde el backend.');
        this.isGoogleConfigured = false;
      }
    });
  }

  private initGoogleOfficialButton(): void {
    if (!this.clientId || !this.isGoogleConfigured) return;
    this.waitForGoogleScript(() => this.renderGoogleButton(this.clientId!));
  }

  private waitForGoogleScript(callback: () => void, attempts = 0): void {
    const google = (window as unknown as { google?: { accounts?: { id?: GoogleIdApi['accounts']['id'] } } }).google;
    if (google?.accounts?.id) {
      callback();
      return;
    }
    if (attempts >= 50) {
      console.warn('El script oficial de Google Identity Services no pudo ser cargado.');
      return;
    }
    setTimeout(() => this.waitForGoogleScript(callback, attempts + 1), 100);
  }

  private renderGoogleButton(clientId: string): void {
    const google = (window as unknown as { google?: { accounts: { id: GoogleIdApi['accounts']['id'] } } }).google;
    if (!google || !this.googleBtnHost?.nativeElement) return;

    try {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: GoogleCredentialResponse) =>
          this.ngZone.run(() => this.handleGoogleCredential(response.credential)),
        auto_select: false,
        cancel_on_tap_outside: true
      });

      google.accounts.id.renderButton(this.googleBtnHost.nativeElement, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        locale: 'es-419',
        width: 340
      });
    } catch (err) {
      console.error('Error al inicializar la API de Google Identity Services:', err);
    }
  }

  handleGoogleCredential(credential?: string): void {
    if (!credential) {
      this.errorMessage = 'No se recibió la credencial de autenticación de Google.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.loginWithGoogle(credential).subscribe({
      next: (result) => {
        this.loading = false;
        if (result.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = result.message;
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Error al validar la cuenta con la API de Google.';
      }
    });
  }
}
