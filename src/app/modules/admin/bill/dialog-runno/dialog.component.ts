import { ReplaySubject, Subject, Subscription, takeUntil } from 'rxjs';
import { Component, OnInit, OnChanges, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTablesModule } from 'angular-datatables';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
    MatDialog,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatDialogRef,
    MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { MatRadioModule } from '@angular/material/radio'
import { StockService } from '../page.service';
import { environment } from 'environments/environment';
import { UtilityService } from 'app/app.utility-service';

@Component({
    selector: 'app-status-form',
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.scss'],
})
export class DialogRunno implements OnInit {

    form: FormGroup;
    stores: any[] = [];
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    addForm: FormGroup;
    type: string = '';

    Id: number;

    Inspection_vatsFilter = new FormControl('');
    filterInspection_vats: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    Inspection_vats: any[] = [];

    constructor(
        private dialogRef: MatDialogRef<DialogRunno>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialog: MatDialog,
        private FormBuilder: FormBuilder,
        private fuseConfirmationService: FuseConfirmationService,
        private _service: StockService,
        private _fuseConfirm: FuseConfirmationService,
        private _US: UtilityService,
    ) {

        this.data.id
        this.type = this.data.type
        this.form = this.FormBuilder.group({
            headId: '',
            status: this.data.status,
            withholding_tax:  ['N', Validators.required],
            withholding_tax_percent:  [0, Validators.required],
        });
        this._service.getInspection_vat().subscribe({
            next: (resp) => {
                this.Inspection_vats = resp
                this.filterInspection_vats.next(this.Inspection_vats.slice());
            },
            error: (err) => {
            }
        })
    }
    protected _onDestroy = new Subject<void>();

    ngOnInit(): void {
        this.Inspection_vatsFilter.valueChanges
        .pipe(takeUntil(this._onDestroy))
        .subscribe(() => {
          this._filteInspection_vats();
        });
    }

    Submit() {
        this._US.confirmAction(
            'สร้างเลขที่ใบกำกับภาษี',
            'คุณต้องการสร้างเลขที่ใบกำกับภาษีใช่หรือไม่',
            this._fuseConfirm,
            () => {
                window.open(
                    `${environment.API_URL}/api/report/exportPDF/billtax_invioce/${this.Id}`,
                );
            }
        );
    }

    onClose() {
        this.dialogRef.close()
    }

    protected _filteInspection_vats() {
        if (!this.Inspection_vats) {
            return;
        }
        let search = this.Inspection_vatsFilter.value;

        if (!search) {
            this.filterInspection_vats.next(this.Inspection_vats.slice());
            return;
        } else {
             search = search.toString().toLowerCase();
        }

        this.filterInspection_vats.next(
            this.Inspection_vats.filter(item =>
                item.no.toLowerCase().includes(search)
            )
        );
    }

    onSelectInspection_vats(event: any, type: any) {
        if (!event) {
          if (this.Inspection_vatsFilter.invalid) {
            this.Inspection_vatsFilter.markAsTouched(); // กำหนดสถานะ touched เพื่อแสดง mat-error
          }
          return;
        }

        const selectedData = event; // event จะเป็นออบเจ็กต์ item

        if (selectedData) {
          this.form.patchValue({
            headId: selectedData.id,
          });
          this.Id = selectedData.id;
          this.Inspection_vatsFilter.setValue(`${selectedData.no}`);
        } else {
          if (this.Inspection_vatsFilter.invalid) {
            this.Inspection_vatsFilter.markAsTouched(); // กำหนดสถานะ touched เพื่อแสดง mat-error
          }
          return;
        }
      }
}
