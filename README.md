# Cumulocity IoT DataHub Table Widget
A table widget for Cumulocity IoT displaying the results of a DataHub query.

![DataHub Table Image](https://user-images.githubusercontent.com/38696279/86902608-18e75600-c106-11ea-8e83-6c4d02a781a3.png)

## Installing the widget
There are 2 options for installtion:
1. Using the [Runtime Widget Loader](https://github.com/SoftwareAG/cumulocity-runtime-widget-loader) - Just upload the widget as a zip to your tenant
2. Building a custom Cumulocity IoT Application - Add the widget as a library

### Installation - Using the Runtime Widget Loader
1. Download the latest `datahub-widget.zip` file from the releases section.
2. Make sure you have either a version of the Cockpit or the AppBuilder that supports runtime widget loading.
3. Open a dashboard
4. Click `more...`
5. Select `Install widget` and follow the instructions

### Installation - As a library
1. (Optional, if you already have a Cumulocity application) Create a new Cumulocity application using the cockpit as a template
2. Download the latest `datahub-widget-library.tgz` from the releases section
3. Inside your Cumulocity application folder, run: `npm install <path>/datahub-widget-library.tgz`
4. Add the widget to an NgModule:
    ```typescript
    NgModule({
       imports: [
           ...
           DatahubWidgetModule
           ...
       ],
    })
    ```

##  Building the Widget
1. Clone this repo: 
    ```
    git clone https://github.com/SoftwareAG/cumulocity-datahub-table-widget.git
    ```
2. Install the dependencies:
    ```
    cd cumulocity-datahub-table-widget
    npm install
    ```
3. Build the widget:
    ```
    npm run build
    ```
4. After the build completes the `/dist` folder will contain a `widget.zip` file, this is your deployable widget

------------------------------

These tools are provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.
_____________________
For more information you can Ask a Question in the [TECHcommunity Forums](http://tech.forums.softwareag.com/techjforum/forums/list.page?product=cumulocity).

You can find additional information in the [Software AG TECHcommunity](http://techcommunity.softwareag.com/home/-/product/name/cumulocity).
