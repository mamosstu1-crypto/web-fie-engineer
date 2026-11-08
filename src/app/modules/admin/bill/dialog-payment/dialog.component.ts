import { Subscription } from 'rxjs';
import { Component, OnInit, OnChanges, Inject, ViewChild, LOCALE_ID } from '@angular/core';
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
import { MatTabGroup } from '@angular/material/tabs';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
    UtilityService,
    DATE_TH_FORMATS,
    CustomDateAdapter,
} from 'app/app.utility-service';
@Component({
    selector: 'app-payment-form',
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' },
    ],
})
export class DialogPayment implements OnInit {
    @ViewChild(MatTabGroup) tabGroup: MatTabGroup;
    form: FormGroup;
    stores: any[] = [];
    invoice_payment: any[] = [];
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    addForm: FormGroup;
    type: string = '';
    Id: number;

    payment: any[] = [
        { value: 'paid_cash', name: 'เงินสด' },
        { value: 'paid_tran', name: 'เงินโอน' },
        { value: 'credit', name: 'เครดิต' },
    ]
    constructor(
        private dialogRef: MatDialogRef<DialogPayment>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialog: MatDialog,
        private FormBuilder: FormBuilder,
        private fuseConfirmationService: FuseConfirmationService,
        private _service: StockService
    ) {
        this.Id = this.data.id
        this.type = this.data.type
        this.invoice_payment = this.data.invoice_payment

        this.form = this.FormBuilder.group({
            invoice_id: null,
            date: [new Date()],
            paid_type: null,
            paid_price: null,
            description: null,
        });
    }

    ngOnInit(): void {
        if (this.data.WithHoldTax !== 0) {
            this.form.patchValue({
                invoice_id: this.data.id,
                paid_type: 'paid_cash',
                paid_price: this.data.WithHoldTax,  
                description: null,
            })  
        } else {
            let paid_price = this.data.total_amount
            if (this.data.invoice_payment.length > 0) {
                paid_price = this.data.invoice_payment[this.data.invoice_payment.length - 1].after_price
            }
            this.form.patchValue({
                invoice_id: this.data.id,
                paid_type: 'paid_cash',
                paid_price: paid_price,
                description: null,
            })
        }

    }

    Submit() {
        this.form.patchValue({
            date: this.form.value.date ? this.form.get('date').value.toISOString().split('T')[0] : null,
        });
        let formValue = this.form.value
        const confirmation = this.fuseConfirmationService.open({
            title: "ยืนยันการบันทึกข้อมูล",
            icon: {
                show: true,
                name: "heroicons_outline:exclamation",
                color: "primary"
            },
            actions: {
                confirm: {
                    show: true,
                    label: "ยืนยัน",
                    color: "primary"
                },
                cancel: {
                    show: true,
                    label: "ยกเลิก"
                }
            },
            dismissible: false
        })

        confirmation.afterClosed().subscribe(
            result => {
                if (result == 'confirmed') {
                    this._service.updatePayment(formValue).subscribe({
                        next: (response) => {
                            // Refresh payment history data
                            this._service.getByIdInvoice(this.Id).subscribe(resp => {
                                this.invoice_payment = resp.data.invoice_payment;
                                this.tabGroup.selectedIndex = 1;
                            });
                        },
                        error: (err) => {
                            // Error handling
                        },
                        complete: () => {
                            // Success handling
                        },
                    });
                }
            }
        )
    }

    onClose() {
        this.dialogRef.close(true)
    }


    print(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/receiptPDF/${id}`
        );
    }
    printreceipt(id: number, id2: number) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/receiptPDF/${id}?invoice_payment_id=${id2}`
        );
    } //ใบสำคัญรับเงิน
    deleteTransec(id: number): void {
        this._service.deleteTransec(id).subscribe({
            next: () => {
                // Refresh payment history data
                this._service.getByIdInvoice(this.Id).subscribe(resp => {
                    this.data = resp.data;
                    this.invoice_payment = resp.data.invoice_payment;
                    this.ngOnInit();
                });
            },
            error: (err) => {
                // this.handleApiError(err);
            },
        });
    }
}
