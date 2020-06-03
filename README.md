# Cumulocity Runtime Widget
Template widget for runtime loading in Cumulocity using the [Runtime Widget Loader](https://github.com/SoftwareAG/cumulocity-runtime-widget-loader) (written by Software AG Global Presales)

##  Building a Widget
1. Clone this repo: 
```git clone https://github.com/SoftwareAG/cumulocity-runtime-widget.git```
2. Install the dependencies:
```
cd cumulocity-runtime-widget
npm install
```
3. Copy your widget's code into the src folder (or a subfolder).
4. Reference your widget's Angular module in the public_api.ts (Comment out or delete the DemoWidgetModule)
```typescript
/* Add your widget's module(s) here */

// export {DemoWidgetModule} from "./demo-widget/demo-widget.module";
export {YourWidgetModule} from "./your-widget/your-widget.module";
```
5. Pick a **unique** contextPath for your widget, eg:
```
my-widget
```
6. Edit the **name** and **interleave** values in the package.json to include the new contextPath:<br>
**Important:** Leave the `-CustomWidget` on the interleave option, and don't edit the `dist/bundle-src/custom-widget.js` part
```json
{
  "name": "my-widget",
  "interleave": {
    "dist\\bundle-src\\custom-widget.js": "my-widget-CustomWidget",
    "dist/bundle-src/custom-widget.js": "my-widget-CustomWidget"
  },
}
```

7. Edit the **contextPath** and **applicationKey** values in the cumulocity.json file to include the contextPath (Feel free to edit the name and icon):
```json
{
  "name": "My Widget",
  "contextPath": "my-widget",
  "key": "my-widget-application-key",
  "contentSecurityPolicy": "default-src 'self'",
  "icon": {
    "class": "fa fa-puzzle-piece"
  },
  "manifest": {
    "noAppSwitcher": true
  }
}
```
8. Build the widget:
```
npm run build
```
9. After the build completes the `/dist` folder will contain a `widget.zip` file, this is your deployable widget

## Deploying a Widget
See the documentation for the [Cumulocity Runtime Widget Loader](https://github.com/SoftwareAG/cumulocity-runtime-widget-loader)
