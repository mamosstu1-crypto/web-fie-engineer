import { Subscription } from 'rxjs';
import { Component, OnInit, OnChanges, Inject, ViewChild } from '@angular/core';
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
import { environment } from 'environments/environment';
import { MatTabGroup } from '@angular/material/tabs';
import { Service } from '../page.service';
@Component({
    selector: 'app-payment-form',
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.scss'],
})
export class DialogPayment implements OnInit {
    @ViewChild(MatTabGroup) tabGroup: MatTabGroup;
    form: FormGroup;
    stores: any[] = [];
    work_order_payment: any[] = [];
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    addForm: FormGroup;
    type: string = '';
    Id: number;
    currentTabIndex: number = 0;

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
        private _service: Service
    ) {
        this.Id = this.data.id
        this.type = this.data.type
        this.work_order_payment = this.data.work_order_payment
        this.form = this.FormBuilder.group({
            work_order_id: null,
            paid_type: null,
            paid_price: null,
            description: null,
            date: null
        });
    }

    ngOnInit(): void {
        let paid_price = this.data.total_amount
        if (this.data.work_order_payment?.length > 0) {
            paid_price = this.data.work_order_payment[this.data.work_order_payment.length - 1].after_price
        }
        this.form.patchValue({
            work_order_id: this.Id,
            paid_type: 'paid_cash',
            paid_price: paid_price,
            description: null,
            date: null
        })
    }
    ngAfterViewInit() {
        // Subscribe to tab changes to track the current tab
        if (this.tabGroup) {
            this.tabGroup.selectedIndexChange.subscribe((index) => {
                this.currentTabIndex = index;
            });
        }
    }

    Submit() {
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
                            this._service.getByworkorder(this.Id).subscribe((resp: any) => {
                                this.work_order_payment = resp.data.work_order_payment;
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
                this._service.getByworkorder(this.Id).subscribe((resp: any) => {
                    this.data = resp.data;
                    this.work_order_payment = resp.data.work_order_payment;
                    this.ngOnInit();
                });
            },
            error: (err) => {
                // this.handleApiError(err);
            },
        });
    }
}
