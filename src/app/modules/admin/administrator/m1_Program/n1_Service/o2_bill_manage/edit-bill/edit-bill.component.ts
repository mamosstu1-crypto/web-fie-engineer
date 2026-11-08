// inspection-bill.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Service } from '../page.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-inspection-bill',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './edit-bill.component.html',
})
export class InspectionBillComponent implements OnInit {
  data: any

  constructor(
    private _service: Service,
    private _activatedRoute : ActivatedRoute
  ) {
    this._service.getData(2459).subscribe((resp: any) => {
        this.data = resp.data;
    })
  }
  get customerFullName(): string {
    const c = this.data.customers;
    return `${c.name} ${c.lname}`;
  }

  ngOnInit(): void {}
}


