import { values } from 'lodash';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { DataTableDirective, DataTablesModule } from 'angular-datatables';
import { StockService } from './page.service';
import { ADTSettings } from 'angular-datatables/src/models/settings';
import { Subject } from 'rxjs';

// import { ToastrService } from 'ngx-toastr';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DateTime } from 'luxon';
import { DialogStatus } from './dialog-status/dialog.component';
import { environment } from 'environments/environment';
import { DialogPayment } from './dialog-payment/dialog.component';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { DialogRunno } from './dialog-runno/dialog.component';
import { DialogInvoice } from './dialog-invoice/dialog.component';
import { DialogWorkOrder } from './dialog-work-order/dialog.component';


@Component({
    selector: 'app-page-document',
    providers: [
        CurrencyPipe,
        DecimalPipe
    ],
    templateUrl: './page.component.html',
    styleUrls: ['./page.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
})
export class DocumentComponent implements OnInit, AfterViewInit {
    dtOptions: any = {};
    dtTrigger: Subject<ADTSettings> = new Subject<ADTSettings>();
    @ViewChild('btNg') btNg: any;
    @ViewChild(DataTableDirective, { static: false })
    dtElement: DataTableDirective;
    form: FormGroup
    @Input() storeId: any;
    @Output() dataArrayChange = new EventEmitter<any[]>();
    itemType: any[] = [];
    type: string = '';
    data: any;
    status1: any[] = [
        { value: 'draft', name: 'ร่าง' },
        { value: 'sent', name: 'รอตรวจสอบ' },
        { value: 'approved', name: 'อนุมัติ' },
        { value: 'create', name: 'สร้างใบแจ้งหนี้แล้ว' },
        { value: 'rejected', name: 'ยกเลิก' },
    ]
    status2: any[] = [
        { value: 'unpaid', name: 'ยังไม่จ่าย' },
        { value: 'paid', name: 'จ่ายแล้ว' },
        { value: 'cancel', name: 'ยกเลิก' },
    ];
    status3: any[] = [
        { value: 'draft', name: 'ร่าง' },
        { value: 'sent', name: 'รอตรวจสอบ' },
        { value: 'approved', name: 'อนุมัติ' },
        { value: 'rejected', name: 'ยกเลิก' },
    ]
    user: any
    @ViewChild('textStatus') textStatus: any;
    constructor(
        private _service: StockService,
        private fuseConfirmationService: FuseConfirmationService,
        // private toastr: ToastrService,
        public dialog: MatDialog,
        private _router: Router,
        private _activated: ActivatedRoute,
        private currencyPipe: CurrencyPipe,
        private _fb: FormBuilder,
        private decimalPipe: DecimalPipe,
        private _changeDetectorRef: ChangeDetectorRef

    ) {
        this.user = JSON.parse(localStorage.getItem('user'))
        this.type = this._activated.snapshot.data.status
        this.form = this._fb.group({
            status: null,
            customer_id: null,
            startDate: [''],
            endDate: [''],
        })
    }
    ngOnInit(): void {

        if (this.type === 'quotation' || this.type === 'taxinvoice') {
            this.form.patchValue({
                status: 'draft'
            })
        } else {
            this.form.patchValue({
                status: 'unpaid'
            })
        }
        if (this.type === 'taxinvoice') {
            this.form.get('startDate')?.valueChanges.subscribe(() => this.rerender());
            this.form.get('endDate')?.valueChanges.subscribe(() => this.rerender());
        }
        this.loadTable()
    }

    ngAfterViewInit() {
        // setTimeout(() => {
        //     this.dtTrigger.next(this.dtOptions);
        // }, 200);
    }

    ngOnDestroy(): void {
        // Do not forget to unsubscribe the event
        this.dtTrigger.unsubscribe();
    }

    checkStatus(data: string) {
        let status: string = data;
        let statusText: string = '';

        if (status === 'quotation') {
            statusText = 'ใบเสนอราคา';
        } else if (status === 'taxinvoice') {
            statusText = 'ใบกำกับภาษี';
        } else if (status === 'billing') {
            statusText = 'ใบวางบิล';
        } else if (status === 'invoice') {
            statusText = 'ใบแจ้งหนี้';
        } else {
            statusText = 'ไม่ทราบสถานะ';
        }
        return statusText
    }

    checkStatusList(data: string) {
        let status: string = data;
        let statusText: string = '';

        if (status === 'draft') {
            statusText = 'ร่าง';
        } else if (status === 'sent') {
            statusText = 'รอตรวจสอบ';
        } else if (status === 'approved') {
            statusText = 'อนุมัติ';
        } else if (status === 'rejected') {
            statusText = 'ยกเลิก';
        } else {
            statusText = 'ไม่ทราบสถานะ';
        }
        return statusText
    }
    public dataRow: any[] = [];
    pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    loadTable(): void {
        const that = this;
        this.dtOptions = {
            pagingType: 'full_numbers',
            pageLength: 25,
            serverSide: true,
            processing: true,
            language: {
                url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json',
            },
            ajax: (dataTablesParameters: any, callback) => {
                dataTablesParameters.search_status = this.form.value.status;
                dataTablesParameters.branche_id = this.user?.employees?.branch_id;
                if (this.type === 'taxinvoice') {
                    const start = this.taxinvoiceListExportDate(this.form.value.startDate);
                    const end = this.taxinvoiceListExportDate(this.form.value.endDate);
                    if (start) {
                        dataTablesParameters.start_date = start;
                    }
                    if (end) {
                        dataTablesParameters.end_date = end;
                    }
                }
                that._service
                    .getAll(dataTablesParameters, this._activated.snapshot.data.status)
                    .subscribe((resp: any) => {
                        this.dataRow = resp.data;

                        // if(this.type === 'taxinvoice') {
                        //     const sortedDataDesc =  resp.data.sort((a, b) => {
                        //         const numA = parseInt(a.no.split('/')[1], 10); // แปลงตัวเลขหลัง "/" เป็น integer
                        //         const numB = parseInt(b.no.split('/')[1], 10);
                        //         return numB - numA; // เรียงจากมากไปน้อย
                        //       });
                        //     this.dataRow = sortedDataDesc;
                        // }

                        this.pages.current_page = resp.current_page;
                        this.pages.last_page = resp.last_page;
                        this.pages.per_page = resp.per_page;
                        if (resp.current_page > 1) {
                            this.pages.begin =
                                resp.per_page * resp.current_page - 1;
                        } else {
                            this.pages.begin = 0;
                        }

                        callback({
                            recordsTotal: resp.total,
                            recordsFiltered: resp.total,
                            data: [],
                        });
                        this._changeDetectorRef.markForCheck();
                    });
            },
            columns: [
                { data: 'action', orderable: false },
                { data: 'No' },
                { data: 'name' },
                { data: 'email' },
                { data: 'tel' },
                { data: 'create_by' },
                { data: 'created_at' },
            ],
        };
    }

    rerender(): void {
        this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
            dtInstance.ajax.reload();
        });
    }


    opendialogAdd() {
        if (this._activated.snapshot.data.status === 'quotation') {
            this._router.navigate(['document/form/quotation'])
        } else if (this._activated.snapshot.data.status === 'billing') {
            this._router.navigate(['document/form/billing'])
        } else if (this._activated.snapshot.data.status === 'taxinvoice') {
            this._router.navigate(['document/form/taxinvoice'])
        }
    }

    openDialogEdit(id: any) {
        if (this._activated.snapshot.data.status === 'quotation') {
            this._router.navigate(['document/edit/quotation/' + id])
        } else if (this._activated.snapshot.data.status === 'invoice') {
            this._router.navigate(['document/edit/invoice/' + id])
        } else if (this._activated.snapshot.data.status === 'billing') {
            this._router.navigate(['document/edit/billing/' + id])
        } else if (this._activated.snapshot.data.status === 'taxinvoice') {
            this._router.navigate(['document/edit/taxinvoice/' + id])
        }

    }
    createInvoice(id: any) {
        this._router.navigate(['document/form/invoice/' + id])
    }

    viewTrans(id: any) {
        const type = this.type.toLocaleLowerCase();
        const url = this._router.serializeUrl(this._router.createUrlTree(['stock/transaction', id]));
        window.open(url, '_blank');
    }

    clickDelete(id: any) {
        const type = this.type

        const confirmation = this.fuseConfirmationService.open({
            title: "ยืนยันลบข้อมูล",
            message: "กรุณาตรวจสอบข้อมูล หากลบข้อมูลแล้วจะไม่สามารถนำกลับมาได้",
            icon: {
                show: true,
                name: "heroicons_outline:exclamation-triangle",
                color: "warn"
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
                    this._service.delete(id, type).subscribe({
                        error: (err) => {

                        },
                        complete: () => {
                            // this.toastr.success('ดำเนินการลบสำเร็จ');
                            this.rerender();
                        },
                    });
                }
            }
        )
    }
    onChangeType(event: MatTabChangeEvent) {
        const index = event.index; // Extract the index from the MatTabChangeEvent

        // สำหรับ quotation หรือ taxinvoice
        if (this.type === 'quotation') {
            if (index === this.status1.length) {
                // Tab "ทั้งหมด"
                this.form.patchValue({ status: '' });
            } else {
                // Tab อื่นๆ
                this.form.patchValue({ status: this.status1[index].value });
            }
        }
        if (this.type === 'taxinvoice') {
            if (index === this.status3.length) {
                // Tab "ทั้งหมด"
                this.form.patchValue({ status: '' });
            } else {
                // Tab อื่นๆ
                this.form.patchValue({ status: this.status3[index].value });
            }
        }
        // สำหรับ invoice หรือ billing
        else if (this.type === 'invoice' || this.type === 'billing') {
            if (index === this.status2.length) {
                // Tab "ทั้งหมด"
                this.form.patchValue({ status: '' });
            } else {
                // Tab อื่นๆ
                this.form.patchValue({ status: this.status2[index].value });
            }
        }

        this.rerender();
    }

    updateStatus(item: any) {
        const DialogRef = this.dialog.open(DialogStatus, {
            disableClose: true,
            width: '600px',
            maxHeight: '90vh',
            data: {
                id: item.id,
                status: item.status,
                type: this._activated.snapshot.data.status
            }
        });
        DialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.rerender();
            }
        });
    }
    opendialogrunno() {
        const DialogRef = this.dialog.open(DialogRunno, {
            disableClose: true,
            width: '600px',
            maxHeight: '90vh',
            data: {

            }
        });
        DialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.rerender();
            }
        });
    }
    opendialoginvoice() {
        const DialogRef = this.dialog.open(DialogInvoice, {
            disableClose: true,
            width: '500px',
            maxHeight: '90vh',
            data: {

            }
        });
        DialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.rerender();
            }
        });
    }
    opendialogworkorder() {
        const DialogRef = this.dialog.open(DialogWorkOrder, {
            disableClose: true,
            width: '500px',
            maxHeight: '90vh',
            data: {

            }
        });
        DialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.rerender();
            }
        });
    }

    updateInvoicePayment(item: any) {
        const DialogRef = this.dialog.open(DialogPayment, {
            disableClose: true,
            width: '60%',
            maxHeight: '100vh',
            data: {
                id: item.id,
                status: item.status,
                type: this._activated.snapshot.data.status,
                invoiceNo: item.no,
                invoice_payment: item.invoice_payment,
                total_amount: item.total_amount,
                WithHoldTax: this.sumPaidPriceWithWithholding(item)
            }
        });
        DialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.rerender();
            }
        });
    }

    printPDF(id: any, type: any) {
        if (type === 'quotation') {
            window.open(environment.API_URL + '/api/quotation/report/' + id)
        } else if (type === 'invoice') {
            window.open(environment.API_URL + '/api/invoice/report/' + id)
        } else if (type === 'billing') {
            window.open(environment.API_URL + '/api/billing/report/' + id)
        } else if (type === 'taxinvoice') {
            let branche_id = this.user?.employees?.branch_id
            window.open(environment.API_URL + '/api/taxinvoice/report/' + id + '?branche_id=' + branche_id)
        } else {
            return;
        }
    }

    printTaxInvoice(item: any): void {
        if (item?.inspection?.id) {
            window.open(
                `${environment.API_URL}/api/report/exportPDF/billtax_invioce/${item.inspection.id}`,
                '_blank'
            );
            return;
        }
        if (item?.tax_invoice?.id) {
            const branche_id = this.user?.employees?.branch_id;
            window.open(
                `${environment.API_URL}/api/taxinvoice/report/${item.tax_invoice.id}?branche_id=${branche_id}`,
                '_blank'
            );
        }
    }

    private taxinvoiceListExportDate(value: unknown): string {
        if (value == null || value === '') {
            return '';
        }
        const d = value instanceof Date ? value : new Date(value as string);
        if (Number.isNaN(d.getTime())) {
            return '';
        }
        return DateTime.fromJSDate(d).toISODate() ?? '';
    }

    taxinvoiceListExportQueryString(): string {
        const params = new URLSearchParams();
        const status = this.form.value.status;
        const branche_id = this.user?.employees?.branch_id;
        if (status) {
            params.set('search_status', status);
        }
        if (branche_id != null && branche_id !== '') {
            params.set('branche_id', String(branche_id));
        }
        const start = this.taxinvoiceListExportDate(this.form.value.startDate);
        const end = this.taxinvoiceListExportDate(this.form.value.endDate);
        if (start) {
            params.set('start_date', start);
        }
        if (end) {
            params.set('end_date', end);
        }
        return params.toString();
    }

    exportPdfTaxinvoiceList(): void {
        const qs = this.taxinvoiceListExportQueryString();
        window.open(
            `${environment.API_URL}/api/report/reportExportPDFtaxinvoice_list${qs ? `?${qs}` : ''}`,
            '_blank'
        );
    }

    exportExcelTaxinvoiceList(): void {
        const qs = this.taxinvoiceListExportQueryString();
        window.open(
            `${environment.API_URL}/api/report/excel/taxinvoice_list${qs ? `?${qs}` : ''}`,
            '_blank'
        );
    }
    printPDF_receipt(id: any) {
        window.open(
            `${environment.API_URL}/api/report/exportPDF/receiptPDF/${id}`
        );
    }

    getpaid_type(item: any) {
        let status: string = item;
        let statusText: string = '';

        if (status === 'paid_cash') {
            statusText = 'เงินสด';
        } else if (status === 'paid_tran') {
            statusText = 'โอนเงิน';
        } else if (status === 'credit') {
            statusText = 'เครดิต';
        } else {
            statusText = '-';
        }
        return statusText
    }

    sumPaidPrice(payments: any[]): number {
        if (!Array.isArray(payments) || payments.length === 0) {
            return 0; // หรือจะ return null ก็ได้ ถ้าอยากแยกกรณี
        }

        return payments.reduce((total, item) => {
            const price = item?.paid_price ?? 0; // ป้องกันกรณี item เป็น undefined หรือไม่มี key

            return total + price;
        }, 0);
    }

    private taxInvoiceBaseAndVat(data: any): { base: number; vat: number } {
        if (!data) {
            return { base: 0, vat: 0 };
        }
        const vat = data.tax != null && data.tax !== '' ? Number(data.tax) : 0;
        let base = data.total != null && data.total !== '' ? Number(data.total) : NaN;
        if (Number.isNaN(base)) {
            const totalAmount = data.total_amount != null ? Number(data.total_amount) : 0;
            base = totalAmount - vat;
        }
        if (Number.isNaN(base)) {
            base = 0;
        }
        return { base, vat };
    }

    calculateInvoiceWithWithholding(data: any): number {
        if (!data) {
            return 0;
        }
        const { base, vat } = this.taxInvoiceBaseAndVat(data);
        if (data.withholding_tax === 'Y') {
            const withholdingPercent = data.withholding_tax_percent != null ? data.withholding_tax_percent : 3;
            const withholdingTax = base * withholdingPercent / 100;
            return (base + vat) - withholdingTax;
        }
        const sum = base + vat;
        return sum !== 0 ? sum : Number(data.total_amount) || 0;
    }

    calculateInvoiceWithWithholdingPercent(data: any): number {
        if (!data) {
            return 0;
        }
        if (data.withholding_tax === 'Y') {
            const { base } = this.taxInvoiceBaseAndVat(data);
            const withholdingPercent = data.withholding_tax_percent != null ? data.withholding_tax_percent : 3;
            return base * withholdingPercent / 100;
        }
        return 0;
    }

    sumPaidPriceWithWithholding(inv: any): number {
        if (inv.withholding_tax === 'Y') {
            const withholdingPercent = inv.withholding_tax_percent != null ? inv.withholding_tax_percent : 3;
            const withholdingTax = inv.total * withholdingPercent / 100;
            return (inv.total + inv.tax) - withholdingTax;
        } else {
            return 0;
        }

    }
    priceWithWithholding(inv: any): number {
        if (inv.withholding_tax === 'Y') {
            const withholdingPercent = inv.withholding_tax_percent != null ? inv.withholding_tax_percent : 3;
            const withholdingTax = inv.total * withholdingPercent / 100;
            return withholdingTax;
        } else {
            return 0;
        }

    }

}
