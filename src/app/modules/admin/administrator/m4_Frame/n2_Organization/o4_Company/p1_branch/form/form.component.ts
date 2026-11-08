import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { debounceTime, lastValueFrom, map, merge, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'environments/environment';
import { AuthService } from 'app/core/auth/auth.service';
import { sortBy, startCase } from 'lodash-es';
import { Service } from '../page.service';
import { UtilityService } from 'app/app.utility-service';
import { DatePipe } from '@angular/common';

// import { ImportOSMComponent } from '../card/import-osm/import-osm.component';

@Component({
    selector: 'form-branch',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss'],
    animations: fuseAnimations
})

export class FormComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild(MatPaginator) private _paginator: MatPaginator;
    @ViewChild(MatSort) private _sort: MatSort;
    quillModules: any = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ align: [] }, { list: 'ordered' }, { list: 'bullet' }],
            ['clean']
        ]
    };
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    formData: FormGroup
    uploadPic: FormGroup
    flashErrorMessage: string;
    flashMessage: 'success' | 'error' | null = null;
    isLoading: boolean = false;
    searchInputControl: FormControl = new FormControl();
    selectedProduct: any | null = null;
    filterForm: FormGroup;
    tagsEditMode: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    env_path = environment.API_URL;
    itemtypeData: any = [];
    categoryData: any = [];
    unitData: any = [];
    imagedatas: any = [];
    imagepic: any;
    files: File[] = [];
    files1: File[] = [];
    images: File[] = [];
    supplierId: string | null;
    url: string | null;
    url_under: string | null;
    user_id: any;
    itemId: any;
    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirmationService: FuseConfirmationService,
        private _formBuilder: FormBuilder,
        private _matDialog: MatDialog,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _authService: AuthService,
        private _Service: Service,
        private _US: UtilityService,

    ) {
        this.user_id = JSON.parse(localStorage.getItem('user'));
        this.formData = this._formBuilder.group({
            id: '',

            address: '',
            approval_letter_number: '',
            book_number_ks_lpg: '',
            book_number_ks_ngv: '',
            book_number_ry_lpg: '',
            book_number_ry_ngv: '',
            business_name: '',
            cal_com: '',
            email: '',
            expiration_date: '',
            expired_ks_lpg: '',
            expired_ks_ngv: '',
            expired_ry_lpg: '',
            expired_ry_ngv: '',
            license_number: '',
            logo: '',
            logo_under: '',
            name: '',
            open_close_time: '',
            open_date: '',
            phone: '',
            tax_id: '',
        })


        // this.addProduct();

    }


    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    async ngOnInit(): Promise<void> {
        this.itemId = this._activatedRoute.snapshot.paramMap.get('id');


        if (this.itemId) {
            this._Service.getByid(this.itemId).subscribe((resp: any) => {
                this.imagepic = resp.data.image;
                this.imagedatas = resp.data.product_images
                this.formData.patchValue({
                    ...resp.data,
                    logo: '',
                    logo_under: ''
                    // image: resp.data.image,
                })
                this.url = resp.data.logo_url
                this.url_under = resp.data.logo_under_url
            })


        }

    }
    get imageShows() {
        return this.formData.controls["images"] as FormArray;
    }
    /**
     * After view init
     */
    addImageShows(file: any) {
        const i = this._formBuilder.group({
            path: file.path,
        });


        this.imageShows.push(i);
    }
    ngAfterViewInit(): void {

    }
    /**
     * On destroy
     */
    ngOnDestroy(): void {

    }
    CreateItem(): void {
        this.flashMessage = null;
        this.flashErrorMessage = null;
        const confirmation = this._fuseConfirmationService.open({
            "title": "Create New Product",
            "message": "Do you want to create a new product ?",
            "icon": {
                "show": true,
                "name": 'heroicons_outline:plus-circle',
                "color": 'info',
            },
            "actions": {
                "confirm": {
                    "show": true,
                    "label": "Confirm",
                    "color": "primary"
                },
                "cancel": {
                    "show": true,
                    "label": "Cancel"
                }
            },
            "dismissible": true
        });


    }
    Submit(): void {
        if (this.itemId) {
            this.update();

        } else {

        }


    }

    async onSelects(event: { addedFiles: File[] }): Promise<void> {
        this.files1 = [];

        // เพิ่มรูปใหม่
        this.files1.push(...event.addedFiles);
        setTimeout(() => {

            this.flashMessage = null;

            // Mark for check
            this._changeDetectorRef.markForCheck();
        }, 150);

        // const file = this.files1[0];
        // const im = await lastValueFrom(this._Service.upload(file))
        // this.formData.patchValue({
        //     image: im.data[0].path,
        // });
    }

    onRemoves(file: File): void {
        const index = this.files1.indexOf(file);
        if (index >= 0) {
            this.files1.splice(index, 1);
        }
    }
    onSelectImage(event: any): void {
        this.images.push(...event.addedFiles);
        setTimeout(() => {
            this._changeDetectorRef.detectChanges();
        }, 150);
    }

    onRemoveImage(event: any) {
        this.images.splice(this.images.indexOf(event), 1);
    }

    onChange(event: any): void {
        var reader = new FileReader();
        reader.readAsDataURL(event.target.files[0]);
        setTimeout(() => {
            this._changeDetectorRef.detectChanges()
        }, 150)
        reader.onload = (e: any) =>
            this.url = e.target.result;
        const file = event.target.files[0];
        this.formData.patchValue({
            logo: file
        });
        this._changeDetectorRef.markForCheck();
    }


    onChangeUnder(event: any): void {
        var reader = new FileReader();
        reader.readAsDataURL(event.target.files[0]);
        setTimeout(() => {
            this._changeDetectorRef.detectChanges()
        }, 150)
        reader.onload = (e: any) =>
            this.url_under = e.target.result;
        const file = event.target.files[0];
        this.formData.patchValue({
            logo_under: file
        });
        this._changeDetectorRef.markForCheck();
    }

    onSelect(event) {
        this.files.push(...event.addedFiles);
        // Trigger Image Preview
        setTimeout(() => {
            this._changeDetectorRef.detectChanges()
        }, 150)
        this.formData.patchValue({
            logo: this.files[0],
        });

    }

    onRemove(event) {
        this.files.splice(this.files.indexOf(event), 1);
        this.formData.patchValue({
            logo: '',
        });
    }

    onSelectUnder(event) {
        this.files1.push(...event.addedFiles);
        // Trigger Image Preview
        setTimeout(() => {
            this._changeDetectorRef.detectChanges()
        }, 150)
        this.formData.patchValue({
            logo_under: this.files1[0],
        });

    }

    onRemoveUnder(event) {
        this.files1.splice(this.files1.indexOf(event), 1);
        this.formData.patchValue({
            logo_under: '',
        });
    }


    private buildBranchFormData(): FormData {
        const formData = new FormData();
        const skipKeys = new Set(['logo', 'logo_under', 'logo_url', 'logo_under_url']);

        Object.entries(this.formData.value).forEach(([key, value]: [string, unknown]) => {
            if (skipKeys.has(key) || value === null || value === undefined) {
                return;
            }
            formData.append(key, value as string | Blob);
        });

        const logoControl = this.formData.get('logo')?.value;
        if (logoControl instanceof File) {
            formData.append('logo', logoControl);
        } else if (this.files.length > 0) {
            formData.append('logo', this.files[0]);
        }

        const logoUnderControl = this.formData.get('logo_under')?.value;
        if (logoUnderControl instanceof File) {
            formData.append('logo_under', logoUnderControl);
        } else if (this.files1.length > 0) {
            formData.append('logo_under', this.files1[0]);
        }

        return formData;
    }

    update(): void {
        const datePipe = new DatePipe("en-US");
        const expiration_date = datePipe.transform(
            this.formData.value.expiration_date,
            "yyyy-MM-dd"
        );
        const expired_ks_lpg = datePipe.transform(
            this.formData.value.expired_ks_lpg,
            "yyyy-MM-dd"
        );
        const expired_ks_ngv = datePipe.transform(
            this.formData.value.expired_ks_ngv,
            "yyyy-MM-dd"
        );
        const expired_ry_lpg = datePipe.transform(
            this.formData.value.expired_ry_lpg,
            "yyyy-MM-dd"
        );
        const expired_ry_ngv = datePipe.transform(
            this.formData.value.expired_ry_ngv,
            "yyyy-MM-dd"
        );
        this.formData.patchValue({
            expiration_date: expiration_date,
            expired_ks_lpg: expired_ks_lpg,
            expired_ks_ngv: expired_ks_ngv,
            expired_ry_lpg: expired_ry_lpg,
            expired_ry_ngv: expired_ry_ngv,
        });

        const formData = this.buildBranchFormData();
        this._US.confirmAction('แก้ไขรายการ', 'คุณต้องการแก้ไขรายการใช่หรือไม่', this._fuseConfirmationService,
            () => {
                this._Service.update(formData, this.formData.get('id').value).subscribe({
                    next: (resp: any) => {
                        const row = resp?.data;
                        if (row?.logo_url) {
                            this.url = row.logo_url;
                        }
                        if (row?.logo_under_url) {
                            this.url_under = row.logo_under_url;
                        }
                        this.files = [];
                        this.files1 = [];
                        this._router
                            .navigateByUrl('branch/list-branch')
                            .then(() => { });
                    },
                    error: (error: any) => {
                        this._US.confirmAction('ข้อผิดพลาด', error.error.message,
                            this._fuseConfirmationService,
                            () => {

                            }, { showConfirm: false, showCancel: false, }
                        )
                    },
                });
            },
        );
    }

    create(): void {
        const datePipe = new DatePipe("en-US");
        const expiration_date = datePipe.transform(
            this.formData.value.expiration_date,
            "yyyy-MM-dd"
        );
        const expired_ks_lpg = datePipe.transform(
            this.formData.value.expired_ks_lpg,
            "yyyy-MM-dd"
        );
        const expired_ks_ngv = datePipe.transform(
            this.formData.value.expired_ks_ngv,
            "yyyy-MM-dd"
        );
        const expired_ry_lpg = datePipe.transform(
            this.formData.value.expired_ry_lpg,
            "yyyy-MM-dd"
        );
        const expired_ry_ngv = datePipe.transform(
            this.formData.value.expired_ry_ngv,
            "yyyy-MM-dd"
        );

        this.formData.patchValue({
            expiration_date: expiration_date,
            expired_ks_lpg: expired_ks_lpg,
            expired_ks_ngv: expired_ks_ngv,
            expired_ry_lpg: expired_ry_lpg,
            expired_ry_ngv: expired_ry_ngv,
        });

        const formData = this.buildBranchFormData();
        this._US.confirmAction('สร้างรายการใหม่', 'คุณต้องการสร้างรายการใหม่ใช่หรือไม่', this._fuseConfirmationService,
            () => {
                this._Service.create(formData).subscribe({
                    next: (resp: any) => {
                        this._router
                            .navigateByUrl('branch/list-branch')
                            .then(() => { });
                    },
                    error: (error: any) => {
                        this._US.confirmAction('ข้อผิดพลาด', error.error.message,
                            this._fuseConfirmationService,
                            () => {

                            }, { showConfirm: false, showCancel: false, }
                        )
                    },
                });
            },
        );
    }


}
