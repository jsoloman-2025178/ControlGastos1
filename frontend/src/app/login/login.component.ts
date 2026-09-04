import { Component, ElementRef, NgZone, OnInit, ViewChild } from '@angular/core';
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
      initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
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
export class LoginComponent implements OnInit {
  @ViewChild('googleBtn') googleBtnHost!: ElementRef<HTMLDivElement>;

  username = '';
  password = '';
  loading = false;
  errorMessage = '';
  sessionExpiredMessage = '';
  googleEnabled = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Muestra el mensaje de sesión (expirada, cerrada, etc.) y luego lo limpia
    this.sessionExpiredMessage = this.authService.sessionMessage();
    this.authService.clearSessionMessage();
    this.setupGoogleSignIn();
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

  private setupGoogleSignIn(): void {
    this.authService.getGoogleClientId().subscribe({
      next: (config) => {
        if (!config?.clientId) return;
        this.waitForGoogleScript(() => this.renderGoogleButton(config.clientId as string));
      },
      error: () => console.warn('No se pudo obtener la configuración de Google desde el backend.')
    });
  }

  private waitForGoogleScript(callback: () => void, attempts = 0): void {
    const google = (window as unknown as { google?: { accounts?: { id?: GoogleIdApi['accounts']['id'] } } }).google;
    if (google?.accounts?.id) { callback(); return; }
    if (attempts >= 50) return;
    setTimeout(() => this.waitForGoogleScript(callback, attempts + 1), 100);
  }

  private renderGoogleButton(clientId: string): void {
    const google = (window as unknown as { google?: { accounts: { id: GoogleIdApi['accounts']['id'] } } }).google;
    if (!google) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) =>
        this.ngZone.run(() => this.handleGoogleCredential(response.credential))
    });

    if (this.googleBtnHost?.nativeElement) {
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
      this.googleEnabled = true;
    }
  }

  handleGoogleCredential(credential?: string): void {
    if (!credential) {
      this.errorMessage = 'No se recibió la credencial de Google.';
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
        this.errorMessage = err.error?.message || 'No se pudo conectar al servidor.';
      }
    });
  }
}
