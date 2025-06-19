import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoaderCubeComponent } from './loader-cube.component';

describe('LoaderCubeComponent', () => {
  let component: LoaderCubeComponent;
  let fixture: ComponentFixture<LoaderCubeComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LoaderCubeComponent]
    });
    fixture = TestBed.createComponent(LoaderCubeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
