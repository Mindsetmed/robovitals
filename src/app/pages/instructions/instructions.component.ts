import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  MINDSET_EIFU_REFERENCE_URL,
  ROBOVITALS_LOGO_PATH,
  ROBOVITALS_MANUAL_PDF_PATH,
} from '../../mindset/instructions-for-use.constants';

@Component({
  selector: 'app-instructions',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './instructions.component.html',
  styleUrl: './instructions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructionsComponent {
  protected readonly logoPath = ROBOVITALS_LOGO_PATH;
  protected readonly manualUrl: SafeResourceUrl;
  protected readonly pdfPath = ROBOVITALS_MANUAL_PDF_PATH;
  protected readonly mindsetEifuUrl = MINDSET_EIFU_REFERENCE_URL;

  constructor(sanitizer: DomSanitizer) {
    this.manualUrl = sanitizer.bypassSecurityTrustResourceUrl('/instructions/user-manual.html');
  }

  protected printManual(): void {
    const frame = document.getElementById('rv-ifu-frame') as HTMLIFrameElement | null;
    frame?.contentWindow?.print();
  }
}
