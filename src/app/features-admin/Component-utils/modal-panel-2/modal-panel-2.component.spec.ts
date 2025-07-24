import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPanel2Component } from './modal-panel-2.component';

describe('ModalPanel2Component', () => {
  let component: ModalPanel2Component;
  let fixture: ComponentFixture<ModalPanel2Component>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalPanel2Component]
    });
    fixture = TestBed.createComponent(ModalPanel2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
