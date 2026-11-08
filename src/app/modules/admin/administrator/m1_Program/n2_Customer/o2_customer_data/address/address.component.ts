import {
  LOCALE_ID, Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, startWith, switchMap, tap } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Service } from '../page.service';
import {
  UtilityService, DATE_TH_FORMATS, CustomDateAdapter,
} from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { FormDataService } from 'app/modules/matdynamic/form-data.service';

@Component({
  selector: 'app-address',
  templateUrl: './address.component.html',
  styleUrls: ['./address.component.scss'],
  providers: [
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
    { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
    { provide: MAT_DATE_LOCALE, useValue: 'th-TH' },
  ],
  animations: fuseAnimations,
})
export class AddressComponent implements OnInit {
  public isLoading = false;
  public dataRow: any[] = [];
  public form!: FormGroup;
  Id: any;
  public formData!: FormGroup;
  public formData_address!: FormGroup;
  public item: any;

  @ViewChild('AddressDialog') AddressDialog!: TemplateRef<any>;
  addressDialogRef: any;
  private editAddressId: number | null = null;
  private fillingAddress = false;
  /** ที่อยู่ก่อนบันทึกลูกค้าครั้งแรก (หน้าเพิ่มใหม่) */
  pendingAddresses: any[] = [];
  private pendingEditIndex: number | null = null;

  // แหล่งข้อมูล (คงไว้)
  public listProvinces: any[] = [];
  public listdistricts: any[] = [];
  public listSubDistricts: any[] = [];

  // ข้อมูลสำหรับแสดงผลใน select (ไม่ใช้ Observable/async)
  public filteredProvinces: any[] = [];
  public filteredDistricts: any[] = [];
  public filteredSubDistricts: any[] = [];

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
    this.Id = this._activatedRoute.snapshot.paramMap.get('id');

    this.formData = this._formBuilder.group({
      id: [''],
      no: ['', Validators.required],
      name: ['', Validators.required],
      lname: [''],
      email: [''],
      phone_number1: [''],
      phone_number2: [''],
      tax_id: [''],
      type: ['', Validators.required],
      is_headquarter: [''],
      address: this._formBuilder.array([]),
    });

    this.formData_address = this._formBuilder.group({
      address: ['', Validators.required],
      zip_code: [''],
      subdistricts: [''],
      districts: [''],
      province: [''],
      subdistrict_id: ['', Validators.required],
      district_id: ['', Validators.required],
      province_id: ['', Validators.required],
      customer_id: ['', Validators.required],
      is_main: [false],
    });
  }

  ngOnInit(): void {
    if (this.Id) {
      this._Service.getCustomerID(this.Id).subscribe((resp) => {
        this.item = resp.data;
        this.formData.patchValue({ ...this.item });
      });
    }

    // โหลดจังหวัดครั้งเดียว
    this._Service.getProvinces().subscribe((resp) => {
      this.listProvinces = resp || [];
      this.filteredProvinces = this.listProvinces.slice();
    });

    // เมื่อ Province เปลี่ยน: reset & โหลด Districts
    this.formData_address.get('province')?.valueChanges
      .pipe(
        startWith(this.formData_address.get('province')?.value || ''),
        tap(() => {
          if (this.fillingAddress) {
            return;
          }
          this.formData_address.patchValue({
            districts: '',
            subdistricts: '',
            province_id: '',
            district_id: '',
            subdistrict_id: '',
            zip_code: '',
          }, { emitEvent: false });
          this.listdistricts = [];
          this.listSubDistricts = [];
          this.filteredDistricts = [];
          this.filteredSubDistricts = [];
        }),
        switchMap((provinceName: string) => {
          const selectedProvince = this.listProvinces.find(p => p.name_th === provinceName);
          const provinceId = selectedProvince?.id || null;
          this.formData_address.get('province_id')?.setValue(provinceId, { emitEvent: false });
          return provinceId ? this._Service.getDistricts(provinceId) : of({ districts: [] });
        })
      )
      .subscribe((resp: any) => {
        this.listdistricts = resp?.districts || [];
        this.filteredDistricts = this.listdistricts.slice();
      });

    // เมื่อ District เปลี่ยน: reset & โหลด Subdistricts
    this.formData_address.get('districts')?.valueChanges
      .pipe(
        startWith(this.formData_address.get('districts')?.value || ''),
        tap(() => {
          if (this.fillingAddress) {
            return;
          }
          this.formData_address.patchValue({
            subdistricts: '',
            district_id: '',
            subdistrict_id: '',
            zip_code: '',
          }, { emitEvent: false });
          this.listSubDistricts = [];
          this.filteredSubDistricts = [];
        }),
        switchMap((districtName: string) => {
          const selectedDistrict = this.listdistricts.find(d => d.name_th === districtName);
          const districtId = selectedDistrict?.id || null;
          this.formData_address.get('district_id')?.setValue(districtId, { emitEvent: false });
          return districtId ? this._Service.getSubDistricts(districtId) : of({ sub_districts: [] });
        })
      )
      .subscribe((resp: any) => {
        this.listSubDistricts = resp?.sub_districts || [];
        this.filteredSubDistricts = this.listSubDistricts.slice();
      });

    // เมื่อ Subdistrict เปลี่ยน: set id + zipcode
    this.formData_address.get('subdistricts')?.valueChanges
      .pipe(startWith(this.formData_address.get('subdistricts')?.value || ''))
      .subscribe((subdistrictName: string) => {
        const selected = this.listSubDistricts.find(s => s.name_th === subdistrictName);
        this.formData_address.get('subdistrict_id')?.setValue(selected?.id || null, { emitEvent: false });
        this.formData_address.get('zip_code')?.setValue(selected?.zip_code || '', { emitEvent: false });
      });

    this.syncCustomerIdValidator();
  }

  showEdit(): boolean { return this._US.hasPermission(1); }
  showDelete(): boolean { return this._US.hasPermission(1); }

  get addressRows(): any[] {
    if (this.Id) {
      return this.item?.customer__addresses ?? [];
    }
    return this.pendingAddresses;
  }

  private syncCustomerIdValidator(): void {
    const control = this.formData_address.get('customer_id');
    if (!control) return;
    if (this.Id) {
      control.setValidators(Validators.required);
    } else {
      control.clearValidators();
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  backTo() { this._router.navigate(['customer_data/list']); }

  Submit(): void {
    if (this.Id) {
      const confirmation = this._fuseConfirm.open({
        title: 'แก้ไขข้อมูล',
        message: 'คุณต้องการแก้ไขข้อมูลใช่หรือไม่ ',
        icon: { show: false, name: 'heroicons_outline:exclamation', color: 'warning' },
        actions: { confirm: { show: true, label: 'ยืนยัน', color: 'sky' }, cancel: { show: true, label: 'ยกเลิก' } },
        dismissible: true,
      });

      confirmation.afterClosed().subscribe((result) => {
        if (result === 'confirmed') {
          const formValue = this.formData.value;
          this._Service.update(formValue, this.Id).subscribe({
            next: () => this._router.navigate(['customer_data/list']),
            error: (err: any) => {
              this._fuseConfirm.open({
                title: 'กรุณาระบุข้อมูล',
                message: err.error?.message,
                icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
                actions: { confirm: { show: false }, cancel: { show: false } },
                dismissible: true,
              });
            },
          });
        }
      });
    } else {
      const confirmation = this._fuseConfirm.open({
        title: 'เพิ่มข้อมูล',
        message: 'คุณต้องการเพิ่มข้อมูลใช่หรือไม่ ',
        icon: { show: false, name: 'heroicons_outline:exclamation', color: 'warning' },
        actions: { confirm: { show: true, label: 'ยืนยัน', color: 'sky' }, cancel: { show: true, label: 'ยกเลิก' } },
        dismissible: true,
      });

      confirmation.afterClosed().subscribe((result) => {
        if (result === 'confirmed') {
          const formValue = this.formData.value;
          this._Service.create(formValue).subscribe({
            next: (resp) => {
              const customerId = resp?.data?.id;
              if (!customerId || this.pendingAddresses.length === 0) {
                this._router.navigate(['customer_data/list']);
                return;
              }
              const saves = this.pendingAddresses.map((row) =>
                this._Service.createCusAddress({
                  address: row.address,
                  zip_code: row.zip_code,
                  province_id: row.province_id,
                  district_id: row.district_id,
                  subdistrict_id: row.subdistrict_id,
                  customer_id: customerId,
                  is_main: row.is_main ? 1 : 0,
                })
              );
              forkJoin(saves).subscribe({
                next: () => this._router.navigate(['customer_data/list']),
                error: (err: any) => {
                  this._fuseConfirm.open({
                    title: 'บันทึกลูกค้าแล้ว แต่ที่อยู่บางรายการไม่สำเร็จ',
                    message: err.error?.message || 'กรุณาแก้ไขที่อยู่จากหน้าแก้ไขลูกค้า',
                    icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
                    actions: { confirm: { show: false }, cancel: { show: false } },
                    dismissible: true,
                  });
                  this._router.navigate(['customer_data/list']);
                },
              });
            },
            error: (err: any) => {
              this._fuseConfirm.open({
                title: 'กรุณาระบุข้อมูล',
                message: err.error?.message,
                icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
                actions: { confirm: { show: false }, cancel: { show: false } },
                dismissible: true,
              });
            },
          });
        }
      });
    }
  }

  /** เติมฟอร์มแก้ไขหลังมีรายการจังหวัด/อำเภอ/ตำบลแล้ว — ไม่ให้ valueChanges ล้างค่า */
  private fillAddressForm(address: any): void {
    const apply = () => {
      const provinceName =
        address.provinces?.name_th
        || this.listProvinces.find((p) => String(p.id) === String(address.province_id))?.name_th
        || '';

      this.fillingAddress = true;
      this.formData_address.patchValue({
        address: address.address ?? '',
        province: provinceName,
        province_id: address.province_id ?? '',
        customer_id: address.customer_id ?? this.Id,
        is_main: !!address.is_main,
        zip_code: address.zip_code ?? '',
      }, { emitEvent: false });

      if (!address.province_id) {
        this.fillingAddress = false;
        return;
      }

      this._Service.getDistricts(String(address.province_id)).subscribe((resp: any) => {
        this.listdistricts = resp?.districts || [];
        this.filteredDistricts = this.listdistricts.slice();
        const districtName =
          address.districts?.name_th
          || this.listdistricts.find((d) => String(d.id) === String(address.district_id))?.name_th
          || '';
        this.formData_address.patchValue({
          districts: districtName,
          district_id: address.district_id ?? '',
        }, { emitEvent: false });

        if (!address.district_id) {
          this.fillingAddress = false;
          return;
        }

        this._Service.getSubDistricts(String(address.district_id)).subscribe((resp2: any) => {
          this.listSubDistricts = resp2?.sub_districts || [];
          this.filteredSubDistricts = this.listSubDistricts.slice();
          const subName =
            address.sub_districts?.name_th
            || this.listSubDistricts.find((s) => String(s.id) === String(address.subdistrict_id))?.name_th
            || '';
          this.formData_address.patchValue({
            subdistricts: subName,
            subdistrict_id: address.subdistrict_id ?? '',
            zip_code: address.zip_code ?? '',
          }, { emitEvent: false });
          this.fillingAddress = false;
        });
      });
    };

    if (this.listProvinces?.length) {
      apply();
      return;
    }
    this._Service.getProvinces().subscribe((resp) => {
      this.listProvinces = resp || [];
      this.filteredProvinces = this.listProvinces.slice();
      apply();
    });
  }

  /** @param key แก้ไข: id บนเซิร์ฟ (มี Id) หรือ index ใน pending (เพิ่มใหม่) */
  openAddressDialog(key?: number): void {
    this.formData_address.reset();
    this.syncCustomerIdValidator();
    this.editAddressId = null;
    this.pendingEditIndex = null;

    if (this.Id && key != null) {
      this.editAddressId = key;
      this._Service.getCusAddressById(String(key)).subscribe((resp) => {
        if (resp.status && resp.data) {
          this.fillAddressForm(resp.data);
        } else {
          this.formData_address.patchValue({ customer_id: this.Id, is_main: false });
        }
      });
    } else if (!this.Id && key != null) {
      this.pendingEditIndex = key;
      const row = this.pendingAddresses[key];
      if (row) {
        this.fillAddressForm(row);
      }
    } else if (this.Id) {
      this.formData_address.patchValue({ customer_id: this.Id, is_main: false });
    } else {
      this.formData_address.patchValue({ is_main: false });
    }

    this.addressDialogRef = this._matDialog.open(this.AddressDialog, { width: '90%' });
  }

  closeDialog(Ref?: any): void {
    Ref ? this._US.closeDialog(Ref) : this._matDialog.closeAll();
  }

  saveAddress(): void {
    if (!this.formData_address.valid) {
      this._fuseConfirm.open({
        title: 'กรุณาระบุข้อมูล',
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
        actions: { confirm: { show: false }, cancel: { show: false } },
        dismissible: true,
      });
      return;
    }

    const proceed = () => this.proceedWithSave();

    if (this.needsMainAddressConfirm()) {
      const mainConfirm = this._fuseConfirm.open({
        title: 'ยืนยันการตั้งค่าที่อยู่หลัก',
        message: 'การตั้งค่าที่อยู่นี้เป็นที่อยู่หลักจะยกเลิกที่อยู่หลักเดิม คุณต้องการดำเนินการต่อหรือไม่?',
        icon: { show: false, name: 'heroicons_outline:exclamation', color: 'warning' },
        actions: { confirm: { show: true, label: 'ยืนยัน', color: 'sky' }, cancel: { show: true, label: 'ยกเลิก' } },
        dismissible: true,
      });
      mainConfirm.afterClosed().subscribe((r) => r === 'confirmed' && proceed());
    } else {
      proceed();
    }
  }

  private proceedWithSave(): void {
    const confirmation = this._fuseConfirm.open({
      title: (this.editAddressId != null || this.pendingEditIndex != null) ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูล',
      message: `คุณต้องการ${(this.editAddressId != null || this.pendingEditIndex != null) ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลใช่หรือไม่`,
      icon: { show: false, name: 'heroicons_outline:exclamation', color: 'warning' },
      actions: { confirm: { show: true, label: 'ยืนยัน', color: 'sky' }, cancel: { show: true, label: 'ยกเลิก' } },
      dismissible: true,
    });

    confirmation.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        const isMain = !!this.formData_address.value.is_main;

        if (!this.Id) {
          this.savePendingAddress(isMain);
          return;
        }

        const formValue = { ...this.formData_address.value, is_main: isMain ? 1 : 0 };

        const observable = this.editAddressId
          ? this._Service.updateCusAddress(formValue, this.editAddressId)
          : this._Service.createCusAddress(formValue);

        observable.subscribe({
          next: (resp) => {
            if (resp.status) {
              this._Service.getCustomerID(this.Id).subscribe((r) => {
                if (r.status) {
                  this.item = r.data;
                  this._changeDetectorRef.markForCheck();
                }
                this.closeDialog(this.addressDialogRef);
                this.editAddressId = null;
              });
            }
          },
          error: (err) => console.error(err),
        });
      }
    });
  }

  private needsMainAddressConfirm(): boolean {
    if (!this.formData_address.get('is_main')?.value) {
      return false;
    }
    if (this.Id) {
      return !this.editAddressId;
    }
    return this.pendingAddresses.some((a, i) => a.is_main && i !== this.pendingEditIndex);
  }

  private savePendingAddress(isMain: boolean): void {
    const v = this.formData_address.value;
    const row = {
      address: v.address,
      zip_code: v.zip_code,
      province_id: v.province_id,
      district_id: v.district_id,
      subdistrict_id: v.subdistrict_id,
      is_main: isMain,
      provinces: { name_th: v.province },
      districts: { name_th: v.districts },
      sub_districts: { name_th: v.subdistricts },
    };

    if (isMain) {
      this.pendingAddresses.forEach((a, i) => {
        if (this.pendingEditIndex === null || i !== this.pendingEditIndex) {
          a.is_main = false;
        }
      });
    }

    if (this.pendingEditIndex != null) {
      this.pendingAddresses[this.pendingEditIndex] = row;
    } else {
      this.pendingAddresses.push(row);
    }

    this.pendingEditIndex = null;
    this.closeDialog(this.addressDialogRef);
    this._changeDetectorRef.markForCheck();
  }

  deleteAddress(key: number): void {
    const confirmation = this._fuseConfirm.open({
      title: 'ลบข้อมูล',
      message: 'คุณต้องการลบข้อมูลใช่หรือไม่',
      icon: { show: false, name: 'heroicons_outline:exclamation', color: 'warning' },
      actions: { confirm: { show: true, label: 'ยืนยัน', color: 'sky' }, cancel: { show: true, label: 'ยกเลิก' } },
      dismissible: true,
    });

    confirmation.afterClosed().subscribe((result) => {
      if (result === 'confirmed') {
        if (!this.Id) {
          this.pendingAddresses.splice(key, 1);
          this._changeDetectorRef.markForCheck();
          return;
        }
        this._Service.deleteCusAddress(key).subscribe({
          next: (resp) => {
            if (resp.status) {
              this._Service.getCustomerID(this.Id).subscribe((r) => {
                if (r.status) {
                  this.item = r.data;
                  this._changeDetectorRef.markForCheck();
                }
              });
            }
          },
          error: (err) => {
            this._fuseConfirm.open({
              title: 'เกิดข้อผิดพลาด',
              message: err.error?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล',
              icon: { show: true, name: 'heroicons_outline:exclamation', color: 'warning' },
              actions: { confirm: { show: false }, cancel: { show: false } },
              dismissible: true,
            });
          },
        });
      }
    });
  }
}
