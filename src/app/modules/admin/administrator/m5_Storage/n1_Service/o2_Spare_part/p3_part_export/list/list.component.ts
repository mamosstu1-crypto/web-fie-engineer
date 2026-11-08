import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom, Observable, ReplaySubject, Subject } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import moment from 'moment';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'list',
    templateUrl: './list.component.html',
    styleUrls: ['./list.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' }
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
    public pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;
    private url: string = '';
    private Id: string = '';

     //item
        itemProduct: any;
        itemFilter = new FormControl('');
        filterItem: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataService: FormDataService,
        private _US: UtilityService,
        private _router: Router
    ) {
        this.itemProduct = this._activatedRoute.snapshot.data.service
        this.filterItem.next(this.itemProduct.slice());
        this.url = this._router.url


        this.formData = this._formBuilder.group({
            name: '',
            id: ['', Validators.required],
        });
        this._formDataService.setFormGroup('formData', this.formData);
    }

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable();
    }
    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // DataTable Initialization
    // loadTable(): void { loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }
    loadTable(): void {
        this.dtOptions = {
            pagingType: 'full_numbers', pageLength: 10, displayStart: this.start,
            serverSide: true, processing: true, responsive: true,
            language: { url: 'https://cdn.datatables.net/plug-ins/1.11.3/i18n/th.json', },
            ajax: (dataTablesParameters: any, callback) => {
                this.currentStart = dataTablesParameters.start;
                dataTablesParameters.type = 'Withdraw';
                this._Service.getPage(dataTablesParameters).subscribe((resp) => {
                    this.dataRow = resp.data; this.pages.current_page = resp.current_page;
                    this.pages.last_page = resp.last_page; this.pages.per_page = resp.per_page;
                    if (resp.current_page > 1) { this.pages.begin = resp.per_page * (resp.current_page - 1); }
                    else { this.pages.begin = 0; }

                    callback({ recordsTotal: resp.total, recordsFiltered: resp.total, data: [], });
                    this._changeDetectorRef.markForCheck();
                });
            },
        };
    }

    // CRUD Operations
    create(): void {
        this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp);
    }
    update(): void { this._US.updateItem(this.formData, this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp); }
    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    // Dialog Operations
    openDialog(item?: any, event?: Event): void {
        if (event) { event.stopPropagation(); }
        item ? (this.formData.patchValue(item), this.isEdit = true) : (this.isEdit = false);
        this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
    }
    closeDialog(Ref?: any): void { (Ref) ? (this._US.closeDialog(Ref)) : (this._matDialog.closeAll()) }

    // Utility Methods
    rerender(): void { this.dtElements.forEach((dtElement: DataTableDirective) =>
        { dtElement.dtInstance.then((dtInstance: any) => dtInstance.ajax.reload()); });
    }
    showEdit(): boolean { return this._US.hasPermission(1); }
    showDelete(): boolean { return this._US.hasPermission(1); }
    showFlashMessage(type: 'success' | 'error'): void { this._US.showFlashMessage(type, this._changeDetectorRef, this); }

    private submitForm(action: (formData: FormData) => Observable<any>): void { this._US.submitForm(
        this.formData, action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
    );}

          private formatDate(dateString: string): string {
                // ตรวจสอบว่า string อยู่ในรูปแบบ YYYY-MM-DD ด้วย moment
                if (moment(dateString, 'YYYY-MM-DD', true).isValid()) {
                    // ถ้าอยู่ในรูปแบบ YYYY-MM-DD ให้ส่งคืนค่าเดิม
                    return dateString;
                }
                // แปลงวันที่เป็นรูปแบบ YYYY-MM-DD
                const formattedDate = moment(dateString).format('YYYY-MM-DD');
                return formattedDate;
            }

    Submit(): void {
        if (this.Id) {
            const confirmation = this._fuseConfirm.open({
                title: "แก้ไขข้อมูล",
                message: "คุณต้องการแก้ไขข้อมูลใช่หรือไม่ ",
                icon: {
                    show: false,
                    name: "heroicons_outline:exclamation",
                    color: "warning"
                },
                actions: {
                    confirm: {
                        show: true,
                        label: "ยืนยัน",
                        color: "sky"
                    },
                    cancel: {
                        show: true,
                        label: "ยกเลิก"
                    }
                },
                dismissible: true
            });

            // Subscribe to the confirmation dialog closed action
            confirmation.afterClosed().subscribe((result) => {
                if (result === 'confirmed') {
                    // let formValue = this.form.value

                    // formValue.date = this.formatDate(formValue.date);
                    // formValue.valid_until = this.formatDate(formValue.valid_until);

                    // this._Service.update(this.Id, formValue).subscribe({
                    //     next: (resp: any) => {
                    //         this._router.navigate(['fix/list']);
                    //     },
                    //     error: (err: any) => {
                    //         this.form.enable();
                    //         this._fuseConfirm.open({
                    //             title: "กรุณาระบุข้อมูล",
                    //             message: err.error.message,
                    //             icon: {
                    //                 show: true,
                    //                 name: "heroicons_outline:exclamation",
                    //                 color: "warning"
                    //             },
                    //             actions: {
                    //                 confirm: {
                    //                     show: false,
                    //                     label: "ยืนยัน",
                    //                     color: "primary"
                    //                 },
                    //                 cancel: {
                    //                     show: false,
                    //                     label: "ยกเลิก"
                    //                 }
                    //             },
                    //             dismissible: true
                    //         });
                    //     }
                    // });
                }
            });
        } else {
            const confirmation = this._fuseConfirm.open({
                title: "เพิ่มข้อมูล",
                message: "คุณต้องการเพิ่มข้อมูลใช่หรือไม่ ",
                icon: {
                    show: false,
                    name: "heroicons_outline:exclamation",
                    color: "warning"
                },
                actions: {
                    confirm: {
                        show: true,
                        label: "ยืนยัน",
                        color: "sky"
                    },
                    cancel: {
                        show: true,
                        label: "ยกเลิก"
                    }
                },
                dismissible: true
            });

            // Subscribe to the confirmation dialog closed action
            confirmation.afterClosed().subscribe((result) => {
                if (result === 'confirmed') {
                  const datePipe = new DatePipe("en-US");
                                   const date = datePipe.transform(
                                     this.formData.value.date,
                                     "yyyy-MM-dd"
                                   );

                                   this.formData.patchValue({
                                       date: date,
                                   })
                                   let formValue = this.formData.value

                    this._Service.create(formValue).subscribe({
                        next: (resp: any) => {
                            this.closeDialog(resp)
                        },
                        error: (err: any) => {
                            this.formData.enable();
                            this._fuseConfirm.open({
                                title: "กรุณาระบุข้อมูล",
                                message: err.error.message,
                                icon: {
                                    show: true,
                                    name: "heroicons_outline:exclamation",
                                    color: "warning"
                                },
                                actions: {
                                    confirm: {
                                        show: false,
                                        label: "ยืนยัน",
                                        color: "primary"
                                    },
                                    cancel: {
                                        show: false,
                                        label: "ยกเลิก"
                                    }
                                },
                                dismissible: true
                            });
                        }
                    });
                }
            });
        }
    }
}
