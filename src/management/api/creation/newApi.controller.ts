/*
 * Copyright (C) 2015 The Gravitee team (http://gravitee.io)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import ApiService from "../../../services/api.service";
import NotificationService from "../../../services/notification.service";
import {IScope, IWindowService, ITimeoutService} from 'angular';
import {StateService, StateParams} from "@uirouter/core";

interface INewApiScope extends IScope{
  importAPIFile: any;
  newApiPageFile: any;
}

class ApiEntity {
  name: string;
  version: string;
  description: string;
  contextPath: string;
  endpoint: string;
  paths: string[];
}

class NewApiController {

  private enableFileImport: boolean;
  private importFileMode: boolean;
  private importURLMode: boolean;
  private apiDescriptorURL: string;
  private importCreateDocumentation: boolean;
  private importCreatePolicyPaths: boolean;
  private importCreatePathMapping: boolean;
  private importCreateMocks: boolean;

  constructor(
    private $scope: INewApiScope,
    private $timeout: ITimeoutService,
    private $mdDialog: angular.material.IDialogService,
    private $stateParams: StateParams,
    private $window: IWindowService,
    private ApiService: ApiService,
    private NotificationService: NotificationService,
    private $state: StateService) {
    'ngInject';

    this.initImportAPISettings();
  }

  initImportAPISettings() {
    var that = this;
    this.enableFileImport = false;
    this.importFileMode= true;
    this.importURLMode= false;
    this.apiDescriptorURL = null;
    this.importCreateDocumentation = true;
    this.importCreatePolicyPaths = false;
    this.importCreatePathMapping = true;
    this.$scope.$watch('importAPIFile.content', function (data) {
      if (data) {
        that.enableFileImport = true;
      }
    });
  }

  importAPI() {
    if (this.importFileMode) {
      var extension = this.$scope.importAPIFile.name.split('.').pop();
      switch (extension) {
        case "yml" :
        case "yaml" :
          this.importSwagger();
          break;
        case "json" :
          if (this.isSwaggerDescriptor()) {
            this.importSwagger();
          } else {
            this.importGraviteeIODefinition();
          }
          break;
        default:
          this.enableFileImport = false;
          this.NotificationService.showError("Input file must be a valid API definition file.");
      }
    } else {
      this.importSwagger();
    }
  }

  importGraviteeIODefinition() {
    var _this = this;
    this.ApiService.import(null, this.$scope.importAPIFile.content).then(function (api) {
      _this.NotificationService.show('API created');
      _this.$state.go('management.apis.detail.portal.general', {apiId: api.data.id});
    });
  }

  importSwagger() {
    let swagger = {
      with_documentation: this.importCreateDocumentation,
      with_path_mapping: this.importCreatePathMapping,
      with_policy_paths: this.importCreatePolicyPaths,
      with_policy_mocks: this.importCreateMocks
    };


    if (this.importFileMode) {
      swagger.type = 'INLINE';
      swagger.payload = this.$scope.importAPIFile.content;
    } else {
      swagger.type = 'URL';
      swagger.payload = this.apiDescriptorURL;
    }

    this.ApiService.importSwagger(swagger).then((api) => {
      this.NotificationService.show('API successfully imported');
      this.$state.go('management.apis.detail.portal.general', {apiId: api.data.id});
    });
  }

  enableImport() {
    if (this.importFileMode) {
      return this.enableFileImport;
    } else {
      return (this.apiDescriptorURL && this.apiDescriptorURL.length);
    }
  }

  isSwaggerDescriptor() {
    try {
      if (this.enableFileImport) {
        var fileContent = JSON.parse(this.$scope.importAPIFile.content);
        return fileContent.hasOwnProperty('swagger')
          || fileContent.hasOwnProperty('swaggerVersion')
          || fileContent.hasOwnProperty('openapi');
      }
    } catch (e) {
      this.NotificationService.showError("Invalid json file.");
      this.enableFileImport = false;
    }
  }

  isSwaggerImport() {
    if (this.importFileMode && this.$scope.importAPIFile) {
      var extension = this.$scope.importAPIFile.name.split('.').pop();
      switch (extension) {
        case "yml" :
        case "yaml" :
          return true;
        case "json" :
          if (this.isSwaggerDescriptor()) {
            return true;
          }
          break;
        default:
          return false;
      }
    }
    return false;
  }
}

export default NewApiController;
