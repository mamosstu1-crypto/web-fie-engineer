import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DialogHeaderComponent } from './dialog-header.component';

@NgModule({
    declarations: [DialogHeaderComponent],
    imports: [CommonModule, MatButtonModule, MatIconModule],
    exports: [DialogHeaderComponent],
})
export class DialogHeaderModule {}
