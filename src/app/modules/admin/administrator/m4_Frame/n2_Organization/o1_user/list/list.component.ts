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
import { ActivatedRoute } from '@angular/router';
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
import { DialogComponent } from '../dialog/dialog.component';
@Component({
    selector: 'list',
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
    public pages = { current_page: 1, last_page: 1, per_page: 10, begin: 0 };
    public isEdit: boolean = false;
    public dialogWidth: number = 40; // scale in %

    public listEmployee: any[] = [];

    @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;
    @ViewChild(MatPaginator) _paginator: MatPaginator;
    @ViewChild('Dialog') Dialog: TemplateRef<any>;

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    private start: number;

    department: any[] = []; //ฝ่าย
    sub_department: any[] = []; //แผนก
    role: any[] = []; //ตำแหน่ง
    type: string;

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirm: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _Service: Service,
        private _matDialog: MatDialog,
        private _activatedRoute: ActivatedRoute,
        private _formDataService: FormDataService,
        private _US: UtilityService,
        private activated: ActivatedRoute
    ) {
        this.formData = this._formBuilder.group(
            {
                id: [''],
                username: ['', Validators.required],
                name: ['', Validators.required],
                employees_id: ['', Validators.required],
                phone_number: '',
                email: ['', Validators.required],
                password: '',
                confirmPassword: '',
            },
            { validator: this.passwordMatchValidator }
        );
        this._formDataService.setFormGroup('formData', this.formData);
        this.department = this.activated.snapshot.data.department;
        this.sub_department = this.activated.snapshot.data.sub_department;
        this.role = this.activated.snapshot.data.role;
    }

    // Lifecycle Hooks
    ngOnInit(): void {
        this._activatedRoute.queryParams.subscribe(
            (params) => (this.start = params['start'])
        );
        this.loadTable();

        this._Service
            .getEmployee()
            .subscribe((resp) => (this.listEmployee = resp.data));

        this.formData
            .get('employees_id')
            .valueChanges.subscribe((employeeId) => {
                const selectedEmployee = this.listEmployee.find(
                    (employee) => employee.id === employeeId
                );
                if (selectedEmployee) {
                    this.formData.patchValue({
                        name: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
                        email: selectedEmployee.email,
                    });
                }
            });
    }

    ngAfterViewInit(): void {}
    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // DataTable Initialization
    loadTable(): void {
        this._US.loadTable(
            this,
            this._Service,
            this._changeDetectorRef,
            this.pages,
            this,
            this.start,
            this
        );
    }

    // CRUD Operations
    create(): void {
        if (!this.formData.get('password')?.value) {
            this.flashMessage = 'error';
            this.showFlashMessage('error');
            this._US.showError('กรุณาระบุรหัสผ่าน', this._fuseConfirm);
            return;
        }
        if (this.formData.invalid) {
            this.formData.markAllAsTouched();
            if (this.formData.errors?.mismatch) {
                this.flashMessage = 'error';
                this.showFlashMessage('error');
            }
            return;
        }
        this._US.createItem(
            this._Service,
            this._fuseConfirm,
            this.submitForm.bind(this),
            this.createResp
        );
    }
    update(): void {
        if (this.formData.invalid) {
            this.formData.markAllAsTouched();
            if (this.formData.errors?.mismatch) {
                this.flashMessage = 'error';
                this.showFlashMessage('error');
            }
            return;
        }
        this._US.updateItem(
            this.formData,
            this._Service,
            this._fuseConfirm,
            this.submitForm.bind(this),
            this.updateResp
        );
    }
    delete(id: any): void {
        this._US.deleteItem(
            id,
            this._Service,
            this._fuseConfirm,
            this.rerender.bind(this),
            this.deleteResp
        );
    }

    // Dialog Operations
    openDialog(item?: any, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }

        this.formData.reset({
            id: '',
            username: '',
            name: '',
            employees_id: '',
            phone_number: '',
            email: '',
            password: '',
            confirmPassword: '',
        });

        if (item?.id) {
            this.isEdit = true;
            this.type = 'EDIT';
            this._Service.getUserById(item.id).subscribe((resp: any) => {
                const user = resp?.data || resp;
                this.formData.patchValue({
                    id: user?.id || item?.id,
                    username: user?.username || item?.username || '',
                    name: user?.name || item?.name || '',
                    employees_id: user?.employees_id || item?.employees_id || item?.employees?.id || '',
                    phone_number: user?.phone_number || item?.phone_number || '',
                    email: user?.email || item?.email || '',
                    password: '',
                    confirmPassword: '',
                });
            });
        } else {
            this.isEdit = false;
            this.type = 'NEW';
        }

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
    // openKeyDialog(item: any): void {
    //     if (this.formData.value.password == this.formData.value.repassword) {
    //         this.formData.patchValue(item);
    //         openDialog(this._matDialog, this.editDialog, this.dialogWidth, this.formData);
    //     } else {

    //     }
    // }

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
        const payload = new FormData();
        payload.append('username', this.formData.get('username')?.value || '');
        payload.append('employees_id', this.formData.get('employees_id')?.value || '');
        payload.append('name', this.formData.get('name')?.value || '');
        payload.append('email', this.formData.get('email')?.value || '');
        payload.append('password', this.formData.get('password')?.value || '');

        action(payload).subscribe({
            next: () => {
                this.showFlashMessage('success');
                this.rerender();
                this.closeDialog();
            },
            error: (err) => {
                this._US.showError(err.error?.message || 'ไม่สามารถบันทึกข้อมูลได้', this._fuseConfirm);
            },
        });
    }

    openDialogsetrole(item: any): void {
        const DialogRef = this._matDialog.open(DialogComponent, {
            disableClose: true,
            width: '50%',
            maxHeight: '90vh',
            data: {
                department: this.department,
                sub_department: this.sub_department,
                role: this.role,
                value: item,
            },
        });
        DialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.rerender();
            }
        });
    }

    hidePassword = true;
    hideConfirmPassword = true;
    togglePasswordVisibility(field: string) {
        if (field === 'password') {
            this.hidePassword = !this.hidePassword;
        } else if (field === 'confirmPassword') {
            this.hideConfirmPassword = !this.hideConfirmPassword;
        }
    }

    passwordMatchValidator(formData: FormGroup) {
        return formData.get('password').value ===
            formData.get('confirmPassword').value
            ? null
            : { mismatch: true };
    }
}
