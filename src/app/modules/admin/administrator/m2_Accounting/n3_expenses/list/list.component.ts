import { LOCALE_ID, Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ViewChildren,
    QueryList, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom, Observable, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import { DataTableDirective } from 'angular-datatables';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
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
    public expense_types: any[] = [];
    public expense_types_fillter: any[] = [];
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
    employeesFilter = new FormControl('');
    filteremployees: ReplaySubject<any[]> = new ReplaySubject<any[]>(1);
    employees: any[] = [];

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;

    status: any[] = [
        // { value: '', name: 'ทั้งหมด' },
        { value: 'expenses', name: 'รายจ่าย' },
        { value: 'income', name: 'รายรับ' },
    ]

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataService: FormDataService,
        private _US: UtilityService,
    ) {
        this.expense_types = this._activatedRoute.snapshot.data.expense_types;
        this.employees = this._activatedRoute.snapshot.data.employees.data;

        this.formData = this._formBuilder.group({
            name: ['', Validators.required],
            id: [''],
            price: ['', Validators.required],
            type: [''],
            date: [new Date().toISOString().split('T')[0]],
            detail: [''],
            branch_id: [this.loginBranchId()],
            expense_type_id: [null, Validators.required],
            status: ['expenses'],
            paid_type: ['', Validators.required],
            employees_id: ['', Validators.required],
        });
        this._formDataService.setFormGroup('formData', this.formData);
        this.filteremployees.next(this.employees.slice());
    }
    protected _onDestroy = new Subject<void>();

    // Lifecycle Hooks
    async ngOnInit(): Promise<void> {
        this._activatedRoute.queryParams.subscribe(params => this.start = params['start']);
        this.loadTable();
        this.formData.get('type').valueChanges.subscribe((value) => {
            this.expense_types_fillter = this.expense_types.filter((item: any) => item.type == value);
        });

        this.employeesFilter.valueChanges
        .pipe(takeUntil(this._onDestroy))
        .subscribe(() => {
          this._filteemployees();
        });
    }
    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    private loginBranchId(): string | number | null {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return (user?.employees ?? user?.Employees)?.branch_id ?? null;
    }

    private loginEmployee(): any {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        return user?.employees ?? user?.Employees;
    }

    // DataTable Initialization
    // loadTable(): void { this._US.loadTable(this, this._Service, this._changeDetectorRef, this.pages, this, this.start, this); }
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
                const user = JSON.parse(localStorage.getItem('user') || 'null');
                dataTablesParameters.branch_id =
                    (user?.employees ?? user?.Employees)?.branch_id ?? null;
                dataTablesParameters.status = this.formData.value.status;
                that._Service
                    .getPage(dataTablesParameters)
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
                { data: 'id', orderable: false },
                { data: 'No' },
                { data: 'name' },
                { data: 'email' },
                { data: 'tel' },
                { data: 'create_by' },
                { data: 'created_at' },
            ],
        };
    }

    // CRUD Operations
    create(): void {
        if(this.formData.invalid) {
            this.formData.markAllAsTouched();
            return;
        }
         const datePipe = new DatePipe("en-US");
          const date = datePipe.transform(
            this.formData.value.date,
            "yyyy-MM-dd"
          );

          this.formData.patchValue({
              date: date,
          })

        this._US.createItem(this._Service, this._fuseConfirm, this.submitForm.bind(this), this.createResp);
    }
    update(): void {
        if(this.formData.invalid) {
            this.formData.markAllAsTouched();
            return;
        }
        const datePipe = new DatePipe("en-US");
        const date = datePipe.transform(
          this.formData.value.date,
          "yyyy-MM-dd"
        );

        this.formData.patchValue({
            date: date,
        })

        this._US.updateItem(this.formData,this._Service, this._fuseConfirm, this.submitForm.bind(this), this.updateResp);
    }

    delete(id: any): void { this._US.deleteItem(id, this._Service, this._fuseConfirm, this.rerender.bind(this), this.deleteResp); }

    // Dialog Operations
    // openDialog(item?: any, event?: Event): void {
    //     if (event) { event.stopPropagation(); }
    //     item ? (this.formData.patchValue(item), this.isEdit = true) : (this.isEdit = false);
    //     this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
    // }
    openDialog(item?: any, event?: Event): void {
        const emp = this.loginEmployee();

        if (event) { event.stopPropagation(); }
        this.formData.reset();
        this.employeesFilter.setValue(`${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim());
        this.formData.patchValue({
            date: new Date().toISOString().split('T')[0],
            branch_id: emp?.branch_id,
            type: this.currentStatus,
            status: this.currentStatus,
            employees_id: emp?.id ?? '',
        });

        if (item) {
            this.formData.patchValue({
                ...item,
                branch_id: emp?.branch_id,
            });
            if(item.employees) {
                this.employeesFilter.setValue(`${item.employees.first_name} ${item.employees.last_name}`);
            }else{
                this.employeesFilter.setValue('');
            }
            this.isEdit = true;

            // Manually filter expense types when editing
            if (item.type) {
                this.expense_types_fillter = this.expense_types.filter((item: any) => item.type == item.type);
            }
        } else {
            this.isEdit = false;
        }

        this._US.openDialog(this._matDialog, this.Dialog, this.dialogWidth, this.formData);
    }
    closeDialog(Ref?: any): void {
        (Ref) ? (this._US.closeDialog(Ref)) : (this._matDialog.closeAll());
    }

    // Utility Methods
    rerender(): void { this.dtElements.forEach((dtElement: DataTableDirective) =>
        { dtElement.dtInstance.then((dtInstance: any) => dtInstance.ajax.reload()); });
    }
    showEdit(): boolean { return this._US.hasPermission(1); }
    showDelete(): boolean { return this._US.hasPermission(1); }
    showFlashMessage(type: 'success' | 'error'): void { this._US.showFlashMessage(type, this._changeDetectorRef, this); }

    // private submitForm(action: (formData: FormData) => Observable<any>): void { this._US.submitForm(
    //     this.formData, action, this._changeDetectorRef, this._fuseConfirm, this, this.rerender.bind(this), this.closeDialog.bind(this)
    // );}
    submitForm(action: (formData: FormData) => Observable<any>): void {
        this._US.submitForm(
            this.formData,
            action,
            this._changeDetectorRef,
            this._fuseConfirm,
            this,
            () => {
                // Preserve current type and status when rerendering
                this.rerender();
                this.formData.patchValue({
                    type: this.currentStatus,
                    status: this.currentStatus,
                    branch_id: this.loginBranchId(),
                });
            },
            this.closeDialog.bind(this)
        );
    }

    formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);

        return `${year}-${month}-${day}`;
    }
    index: number = 0;
    onChangeType(event: MatTabChangeEvent) {
        const index = event.index;
        this.index = index;
        if (index === this.status.length) {
            this.currentStatus = '';
            this.formData.patchValue({
                status: '',
                type: ''
            });
        } else {
            this.currentStatus = this.status[index].value;
            this.formData.patchValue({
                status: this.status[index].value,
                type: this.status[index].value
            });
        }
        this.rerender();
    }
    currentStatus: string = 'expenses';

    protected _filteemployees() {
        if (!this.employees) {
            return;
        }
        let search = this.employeesFilter.value;

        if (!search) {
            this.filteremployees.next(this.employees.slice());
            return;
        } else {
             search = search.toString().toLowerCase();
        }

        this.filteremployees.next(
            this.employees.filter(item =>
                item.first_name.toLowerCase().includes(search)
            )
        );
    }

    onSelectemployees(event: any) {
        if (!event) {
          if (this.employeesFilter.invalid) {
            this.employeesFilter.markAsTouched();
          }
          return;
        }

        const selectedData = event;


        if (selectedData) {
          this.formData.patchValue({
            // detail: `${selectedData.first_name} ${selectedData.last_name}`,
            employees_id: selectedData.id,
          });
          this.employeesFilter.setValue(`${selectedData.first_name} ${selectedData.last_name}`);
        } else {
          if (this.employeesFilter.invalid) {
            this.employeesFilter.markAsTouched();
          }
          return;
        }
    }
}
