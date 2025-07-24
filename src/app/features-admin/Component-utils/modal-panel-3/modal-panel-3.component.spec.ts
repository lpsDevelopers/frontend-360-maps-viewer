import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPanel3Component } from './modal-panel-3.component';

describe('ModalPanel3Component', () => {
  let component: ModalPanel3Component;
  let fixture: ComponentFixture<ModalPanel3Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalPanel3Component]
    });
    fixture = TestBed.createComponent(ModalPanel3Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
