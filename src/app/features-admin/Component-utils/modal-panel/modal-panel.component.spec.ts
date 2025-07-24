import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalPanelComponent } from './modal-panel.component';

describe('ModalPanelComponent', () => {
  let component: ModalPanelComponent;
  let fixture: ComponentFixture<ModalPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalPanelComponent]
    });
    fixture = TestBed.createComponent(ModalPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
