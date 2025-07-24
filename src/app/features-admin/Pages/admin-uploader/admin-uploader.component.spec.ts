import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUploaderComponent } from './admin-uploader.component';

describe('AdminUploaderComponent', () => {
  let component: AdminUploaderComponent;
  let fixture: ComponentFixture<AdminUploaderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdminUploaderComponent]
    });
    fixture = TestBed.createComponent(AdminUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
