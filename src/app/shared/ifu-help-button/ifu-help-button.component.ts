import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { INSTRUCTIONS_FOR_USE_PATH } from '../../mindset/instructions-for-use.constants';

@Component({
  selector: 'app-ifu-help-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ifu-help-button.component.html',
  styleUrl: './ifu-help-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IfuHelpButtonComponent {
  @Input() variant: 'light' | 'dark' = 'light';
  @Input() label = 'Instructions for Use';

  protected readonly instructionsPath = INSTRUCTIONS_FOR_USE_PATH;

  protected openInstructions(): void {
    window.open(this.instructionsPath, 'robovitals-ifu', 'noopener,noreferrer');
  }
}
