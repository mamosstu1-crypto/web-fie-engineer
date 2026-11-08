import { Subscription } from 'rxjs';
import { Component, OnInit, OnChanges, Inject } from '@angular/core';
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
import {
    FormBuilder,
    FormControl,
    FormGroup,
    FormsModule,
    Validators,
} from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { MatRadioModule } from '@angular/material/radio';
import { Service } from '../page.service';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-dialog',
    templateUrl: './dialog.component.html',
    styleUrls: ['./dialog.component.scss'],
})
export class DialogComponent implements OnInit {
    form: FormGroup;
    formFieldHelpers: string[] = ['fuse-mat-dense'];
    departments: any[] = [];
    sub_departments: any[] = [];
    roles: any[] = [];
    value: any;

    constructor(
        private dialogRef: MatDialogRef<DialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialog: MatDialog,
        private FormBuilder: FormBuilder,
        private fuseConfirmationService: FuseConfirmationService,
        private _service: Service,
        private activated: ActivatedRoute
    ) {
        if (
            this.data.value.user_position &&
            this.data.value.user_position.length > 0
        ) {
            this.value =
                this.data.value.user_position[
                    this.data.value.user_position.length - 1
                ];
        }
        this.departments = this.data?.department;
        this.sub_departments = this.data?.sub_department;
        this.roles = this.data?.role;

        this.form = this.FormBuilder.group({
            id: this.value?.id,
            user_id: this.value?.user_id ?? this.data.value.id,
            role_id: this.value?.role_id,
            department_id: this.value?.department_id,
            sub_department_id: this.value?.sub_department_id,
        });
    }

    ngOnInit(): void {}

    Submit() {
        let formValue = this.form.value;

        const confirmation = this.fuseConfirmationService.open({
            title: 'ยืนยันการบันทึกข้อมูล',
            icon: {
                show: true,
                name: 'heroicons_outline:exclamation',
                color: 'primary',
            },
            actions: {
                confirm: {
                    show: true,
                    label: 'ยืนยัน',
                    color: 'primary',
                },
                cancel: {
                    show: true,
                    label: 'ยกเลิก',
                },
            },
            dismissible: false,
        });

        confirmation.afterClosed().subscribe((result) => {
            if (result == 'confirmed') {
                this._service.updateUserPosition(formValue).subscribe({
                    error: (err) => {
                        // this.toastr.error('ไม่สามารถบันทึกข้อมูลได้')
                    },
                    complete: () => {
                        // this.toastr.success('ดำเนินการเพิ่มข้อมูลสำเร็จ')
                        this.dialogRef.close(true);
                    },
                });
            }
        });
    }

    onClose() {
        this.dialogRef.close();
    }
}
