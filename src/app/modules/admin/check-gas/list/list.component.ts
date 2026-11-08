import {
    LOCALE_ID,
    Component,
    OnInit,
    AfterViewInit,
    OnDestroy,
    ViewChild,
    ViewChildren,
    QueryList,
    TemplateRef,
    ChangeDetectorRef,
    ChangeDetectionStrategy,
    HostListener,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Observable, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import {
    UtilityService,
    DATE_TH_FORMATS,
    CustomDateAdapter,
} from 'app/app.utility-service';
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
} from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { DialogStatus } from '../dialog-status/dialog.component';
import { environment } from 'environments/environment';

@Component({
    selector: 'check-gas-list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' },
    ],
    animations: fuseAnimations,
})
export class ListComponent implements OnInit, AfterViewInit, OnDestroy {
    // Properties and ViewChilds
    public dtOptions: DataTables.Settings = {};
    public dataRow: any[] = [];
    public formData: FormGroup;
    public createResp: any[] = [];
    public updateResp: any[] = [];
    public deleteResp: any[] = [];
    public flashMessage: 'success' | 'error' | null = null;
    public isLoading: boolean = false;
    public currentStart: number = 0;
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;

    public listItemType: any[] = [];

    type: string = '';
    status: any[] = [{ value: 0 }, { value: 1 }];
    form: FormGroup;

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataService: FormDataService,
        private _US: UtilityService,
        private _router: Router,
        private _dialog: MatDialog
    ) {
        this.formData = this._formBuilder.group({
            id: ['', Validators.required],
            QTY: [''],
            image: null,
            name: [''],
            price: [''],
            descriptions: [''],
            item_type_id: [''],
            image_url: [''],
            startDate: [''],
            endDate: [''],
        });
        this._formDataService.setFormGroup('formData', this.formData);

        this.form = this._formBuilder.group({
            status: 0,
        });
    }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(
            (params) => (this.start = params['start'])
        );
        this.loadTable();

        this.formData.get('startDate')?.valueChanges.subscribe(() => { this.rerender(); });
        this.formData.get('endDate')?.valueChanges.subscribe(() => { this.rerender(); });
        // this._Service.getItemType().subscribe((resp) => { this.listItemType = resp });
    }
    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    chaNostring(cha_no: any) {
        if (cha_no.length === 0) {
            return '-';
        }
        const result: string = cha_no.join(',');
        return result;
    }

    // DataTable Initialization
    // loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }

    // CRUD Operations
    create(): void {
        this._US.confirmAction(
            'สร้างรายการใหม่',
            'คุณต้องการสร้างรายการใหม่ใช่หรือไม่',
            this._fuseConfirm,
            () => {
                this._Service.create(this.formatForm()).subscribe({
                    next: (resp: any) => {
                        this.createResp = resp;
                        this.closeDialog();
                        this.rerender();
                    },
                    error: (error: any) => {
                        this._US.confirmAction(
                            'ข้อผิดพลาด',
                            error.error.message,
                            this._fuseConfirm,
                            () => {},
                            { showConfirm: false, showCancel: false }
                        );
                    },
                });
            }
        );
    }
    update(): void {
        this._US.confirmAction(
            'แก้ไขรายการ',
            'คุณต้องการแก้ไขรายการใช่หรือไม่',
            this._fuseConfirm,
            () => {
                this._Service
                    .update(this.formatForm(), this.formData.get('id').value)
                    .subscribe({
                        next: (resp: any) => {
                            this.updateResp = resp;
                            this.closeDialog();
                            this.rerender();
                        },
                        error: (error: any) => {
                            this._US.confirmAction(
                                'ข้อผิดพลาด',
                                error.error.message,
                                this._fuseConfirm,
                                () => {},
                                { showConfirm: false, showCancel: false }
                            );
                        },
                    });
            }
        );
    }
    private formatForm(): any {
        const formData = new FormData();
        Object.entries(this.formData.value).forEach(([key, value]: any[]) => {
            if (key != 'image') {
                formData.append(key, value);
            }
        });
        if (this.files) {
            formData.append('image', this.files);
        }
        return formData;
    }
    // create(): void { this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp); }
    // update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    delete(id: any): void {
        this._US.deleteItem(
            id,
            this._Service,
            this._fuseConfirm,
            this.rerender.bind(this),
            this.deleteResp
        );
    }

    files: File | null = null;
    imagePreview: string | null = null;
    onSelect(event: any) {
        this.files = event.addedFiles[0];

        const reader = new FileReader(); // แปลงไฟล์เป็น URL เพื่อแสดงใน <img>
        reader.onload = (e: any) => {
            this.imagePreview = e.target.result;
        };
        reader.readAsDataURL(this.files);
    }
    onRemove(event) {
        this.files = null;
    }

    // Dialog Operations
    openDialog(item?: any, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        this.files = null;
        item
            ? (this.formData.patchValue(item), (this.isEdit = true))
            : (this.isEdit = false);
        this._US.openDialog(
            this._matDialog,
            this.Dialog,
            this.dialogWidth,
            this.formData
        );
    }
    closeDialog(Ref?: any): void {
        Ref ? this._US.closeDialog(Ref) : this._matDialog.closeAll();
    }

    // Utility Methods
    rerender(): void {
        this.dtElements.forEach((dtElement: DataTableDirective) => {
            dtElement.dtInstance.then((dtInstance: any) =>
                dtInstance.ajax.reload()
            );
        });
    }
    showEdit(): boolean {
        return this._US.hasPermission(1);
    }
    showDelete(): boolean {
        return this._US.hasPermission(1);
    }
    showFlashMessage(type: 'success' | 'error'): void {
        this._US.showFlashMessage(type, this._changeDetectorRef, this);
    }

    private submitForm(action: (formData: FormData) => Observable<any>): void {
        this._US.submitForm(
            this.formData,
            action,
            this._changeDetectorRef,
            this._fuseConfirm,
            this,
            this.rerender.bind(this),
            this.closeDialog.bind(this)
        );
    }

    opendialogAdd() {
        this._router.navigate(['check-gas/list/formGas']);
    }

    openDialogEdit(item: any) {

        const DialogRef = this._dialog.open(DialogStatus, {
            disableClose: true,
            width: '90%',
            maxHeight: '100vh',
            data: {
                id: item.id,
                // type: this._activatedRoute.snapshot.data.status,
                time: item.time,
                date: item.date,

                inspection_vehicle_id: item.inspection_vehicle_id,
                engineer_id: item.engineer_id,
                customer_no: item.customer_no,
                no_gas: item.no_gas,
                brand_gas: item.brand_gas,

                service_or: item.service_or,
                cha_no: item.cha_no,
                install_no: item.install_no,

                photo_vehicle_gas: item.photo_vehicle_gas,
                total_weight_gas: item.total_weight_gas,
            },
        });
        DialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.rerender();
            }
        });
    }

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
                const user = JSON.parse(localStorage.getItem('user'));
                const branch_id =  user?.employees?.branch_id;
                dataTablesParameters.branch_id = branch_id;
                dataTablesParameters.data_gas = this.form.value.status;
                dataTablesParameters.start_date = this.formData.get('startDate')?.value;
                dataTablesParameters.end_date = this.formData.get('endDate')?.value;
                if (
                    dataTablesParameters.order &&
                    dataTablesParameters.order.length > 0
                ) {
                    const order = dataTablesParameters.order[0];
                    const column = dataTablesParameters.columns[order.column];
                    dataTablesParameters.sortField = column.data;
                    dataTablesParameters.sortOrder =
                        order.dir === 'asc' ? 1 : -1;
                }
                that._Service
                    .getAll(dataTablesParameters)
                    .subscribe((resp: any) => {
                        this.dataRow = resp.data;
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
            order: [[0, 'desc']],
        };
    }
    onChangeType(event: MatTabChangeEvent) {
        const index = event.index;
        if (index === 0) {
            this.form.patchValue({ status: 0 });
        } else {
            this.form.patchValue({ status: this.status[index].value });
        }
        this.rerender();
    }

    updateStatus(item: any) {
        const DialogRef = this._dialog.open(DialogStatus, {
            disableClose: true,
            width: '400px',
            maxHeight: '100vh',
            data: {
                id: item.id,
                status: item.status,
                type: this._activatedRoute.snapshot.data.status,
            },
        });
        DialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.rerender();
            }
        });
    }

    printPDF(id: any, type: any) {
        if (type === 'success') {
            window.open(
                environment.API_URL + '/api/report/exportPDF/certificate/' + id
            );
        } else if (type === 'open') {
            window.open(
                environment.API_URL + '/api/report/exportPDF/receiptcar/' + id
            );
        } else {
            return;
        }
    }

    printPDF1(id: any) {        // ใบอนุญาต
        this._US.openPDF(`${environment.API_URL}/api/license/${id}`);
    }
    printPDF2(id: any) {        //รูปถ่าย LPG
        this._US.openPDF(`${environment.API_URL}/api/license_image/${id}`);
    }
    printPDF3(id: any) {        //check list ต่ออายุถัง
        this._US.openPDF(`${environment.API_URL}/api/report/ListPDFcheck_testLPG/${id}`);  //ส่ง id บิล
    }
    printPDF4(id: any) {        //ลอกลายถัง NGV รถ ขนส่ง
        this._US.openPDF(`${environment.API_URL}/api/report/exportPDF/certificate_gas/${id}`); //ส่ง id รถ
    }
    printPDF5(id: any) {        //แบบประเมินติดตั้ง NGV
        this._US.openPDF(`${environment.API_URL}/api/report/report_cng/${id}`); //id บิล
    }

    pdf() {
        const user = JSON.parse(localStorage.getItem('user'));
        const branch_id =  user?.employees?.branch_id;
        const startDate = this.formData.get('startDate')?.value || this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate = this.formData.get('endDate')?.value || this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        window.open(`${environment.API_URL}/api/report/gas_report?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branch_id}`, '_blank');
    }

    excel() {
        const user = JSON.parse(localStorage.getItem('user'));
        const branch_id =  user?.employees?.branch_id;
        const startDate =
            this.formData.get('startDate')?.value ||
            this._US.pdfDefaultDate('firstDayOfMonth');
        const endDate =
            this.formData.get('endDate')?.value ||
            this._US.pdfDefaultDate('lastDayOfMonth');
        const formatSDate = this._US.pdfDateFormat(startDate);
        const formatEDate = this._US.pdfDateFormat(endDate);

        window.open(
            `${environment.API_URL}/api/report/excel/gas1_report?start_date=${formatSDate}&end_date=${formatEDate}&branch_id=${branch_id}`,
            '_blank'
        );
    }
    
    onDateChange(event: any, controlName: string, formName: FormGroup): void {
        this._US.onDateChange(event, controlName, formName);
    }
}
