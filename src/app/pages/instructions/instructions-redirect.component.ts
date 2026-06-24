import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { INSTRUCTIONS_FOR_USE_PATH } from '../../mindset/instructions-for-use.constants';

@Component({
  selector: 'app-instructions-redirect',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InstructionsRedirectComponent implements OnInit {
  ngOnInit(): void {
    globalThis.location.replace(INSTRUCTIONS_FOR_USE_PATH);
  }
}
