import { Component, Input } from '@angular/core';

@Component({
    templateUrl: './demo-widget.component.html',
    styles: [ `.text { transform: scaleX(-1); font-size: 3em ;}` ]
})
export class WidgetDemo {
    @Input() config;
}
