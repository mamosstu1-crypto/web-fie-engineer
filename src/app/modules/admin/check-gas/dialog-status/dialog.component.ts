import { Subscription } from 'rxjs';
import { Component, OnInit, OnChanges, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
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
import { StockService } from '../../bill/page.service';
import { Service } from '../page.service';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { UtilityService, DATE_TH_FORMATS, CustomDateAdapter } from 'app/app.utility-service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { NgxMaskModule } from 'ngx-mask';

@Component({
    selector: 'app-status-form',
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.scss'],
    providers: [
        { provide: DateAdapter, useClass: CustomDateAdapter },
        { provide: MAT_DATE_FORMATS, useValue: DATE_TH_FORMATS },
        { provide: LOCALE_ID, useValue: 'th-TH-u-ca-gregory' },
        { provide: MAT_DATE_LOCALE, useValue: 'th-TH' }
    ],

})
export class DialogStatus implements OnInit {

    form: FormGroup;
    formData: FormGroup;
    stores: any[] = [];
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    addForm: FormGroup;
    type: string = '';

    engineers: any
    status: any[] = [
        { value: 'open', name: 'เปิด' },
        { value: 'wait', name: 'รอซ่อม' },
        { value: 'repairing', name: 'กำลังซ่อม' },
        { value: 'success', name: 'เสร็จสิ้น' },
        { value: 'cancel', name: 'ยกเลิก' },
    ]

    constructor(
        private dialogRef: MatDialogRef<DialogStatus>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialog: MatDialog,
        private FormBuilder: FormBuilder,
        private fuseConfirmationService: FuseConfirmationService,
        private _service: Service
    ) {

        this.data.id
        this.type = this.data.type
        this.form = this.FormBuilder.group({
            status: this.data.status
        });
        this.numberArray = this.data.cha_no

        this.formData = this.FormBuilder.group({
            id: [this.data.id, Validators.required],
            // type: this._activatedRoute.snapshot.data.status,
            time: [null],
            date: [null],

            inspection_vehicle_id: [null,Validators.required],
            engineer_id: [null],
            customer_no: [null],

            service_or: [null],
            cha_no: [null],
            install_no: [null],
            brand_gas:[null],
            no_gas:[null],
            total_weight_gas:[null],

            image_url: [null],

            remark: [null],
        });
    }

    ngOnInit(): void {
        this._service.getEngineer().subscribe((resp:any) => { this.engineers = resp.data; });
        const formattedTime = this.data?.time ? this.data.time.split(':').slice(0, 2).join('') : '';
        this.formData.patchValue({
            ...this.data ,
            time: formattedTime,
            image_url: this.data?.photo_vehicle_gas ?? ''
        });
    }

    Submit() {
        const dateValue = formatDate(this.formData.get('date')?.value, 'yyyy-MM-dd', 'th-TH');

        this.formData.patchValue({
            date: dateValue,
            cha_no: this.numberArray
        });
        let formValue = this.formData.value

        Object.keys(formValue).forEach(key => {
            if (formValue[key] == null) {
                delete formValue[key];
            }
        });

        const confirmation = this.fuseConfirmationService.open({
            title: "ยืนยันการบันทึกข้อมูล",
            message: "คุณต้องการบันทึกข้อมูลใช่หรือไม่?",
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
            dismissible: false
        })

        confirmation.afterClosed().subscribe(
            result => {
                if (result == 'confirmed') {
                    this._service.updateGas(this.data.id, this.formatForm()).subscribe({
                        next: (resp) => {
                            this.dialogRef.close()
                        },
                        error: (err) => {
                            // this.toastr.error('ไม่สามารถบันทึกข้อมูลได้')
                        },
                        complete: () => {
                            this.dialogRef.close(true)
                        },
                    });
                }
            }
        )
    }

    onClose() {
        this.dialogRef.close()
    }

    separatorKeysCodes: number[] = [ENTER, COMMA]; // กำหนดปุ่มที่ใช้แยกค่า (Enter, Comma)
    chipControl = new FormControl(); // FormControl สำหรับ input
    numberArray: number[] = []; // Array ที่ใช้เก็บค่าตัวเลข

    // เพิ่มค่าใน Array
    addChip(event: any): void {
        const value = (event.value || '').trim();
        if (value) {
            const number = parseInt(value, 10);
            if (!isNaN(number)) {
                this.numberArray.push(number); // เพิ่มตัวเลขลงใน Array
            } else {
                alert('กรุณากรอกตัวเลขที่ถูกต้อง');
            }
        }
        // ล้าง input หลังจากเพิ่มค่า
        event.chipInput!.clear();
        this.chipControl.setValue(null);
    }

    // ลบ chip ออกจาก Array
    removeChip(index: number): void {
        if (index >= 0) {
            this.numberArray.splice(index, 1);
        }
    }

    files: File | null = null;
    imagePreview: string | null = null;
    onSelect(event: any) {
        this.files = event.addedFiles[0];

        const reader = new FileReader(); // แปลงไฟล์เป็น URL เพื่อแสดงใน <img>
        reader.onload = (e: any) => { this.imagePreview = e.target.result; };
        reader.readAsDataURL(this.files);
    }
    onRemove(event) {
        this.files = null;
        this.imagePreview = null;
    }

    private formatForm(): any {
        const formData = new FormData();

        Object.entries(this.formData.value).forEach(([key, value]: [string, any]) => {
            if (key !== 'photo') {
                // ถ้าไม่ใช่รูป ก็ append ได้ตรง ๆ
                // ถ้า install_no เป็น array ก็จะถูก append เป็น JSON String ถ้าจำเป็น
                // หรืออาจส่งเป็น multi-value ถ้าทาง API รองรับ
                if (Array.isArray(value)) {
                    // ถ้าต้องการส่งเป็นหลายค่า เช่น formData.append('install_no[]', val);
                    // ให้วนลูป append ทีละตัวก็ได้
                    value.forEach(v => formData.append(`${key}[]`, v));
                } else {
                    formData.append(key, value);
                }
            }
        });

        if (this.files) {
            formData.append('photo', this.files);
        }
        return formData;
    }
}
