import { Injectable, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as iassign from "immutable-assign";
iassign.setOption({disableExtraStatementCheck:true});

export class xcelsior<T> {

  public modelUpdated$: EventEmitter<Object> = new EventEmitter();

  private _model: any;
  private _history:Array<T> = new Array<T>();
  private objToParent : Map<any, ChildLocator> = new Map<any,ChildLocator>();

  constructor(initialState:T, private useHistory: boolean = true) {
    this._model = Object.assign({}, initialState);
    this.setParents(this._model);
  }

  get model(): T {
    return this._model;
  }

  set model(newModel: T) {
    this._model = newModel;
    this.modelUpdated$.emit(newModel);
}

  get history(): Array<T> {
    return this._history;
  }

  modify(target: any, callback: (n: any) => any) : void {

    let locator: ChildLocator = this.getChildLocator(target);
    var newValue = iassign(locator.parent[locator.key], callback);
    var oldValue = locator.parent[locator.key];

    // if the value wasn't changed, return
    if (newValue === oldValue) {
      return;
    }

    // add the model to the history
    if (this.useHistory) { 
      this.pushHistory();
    }

    // now stamp out a new object
    let oldState = this._model;
    var pathKeys = [];
    var obj = locator.parent;

    var pathString = "";
    var setKey = locator.key;
    while (obj && locator) {
      obj = locator.parent;
      locator = this.getChildLocator(locator.parent);
      if (locator) {
        pathString = "." + locator.key + pathString;
        pathKeys = [locator.key].concat(pathKeys);
      }
    }

    pathString = "n" + pathString;

    var lookupFunction = function(){};
    lookupFunction.toString = function() { return "function(n) { return " + pathString + "; }" };

    let newState = iassign(
      oldState,
      lookupFunction,
      function(b) {
        b[setKey] = newValue;
        return b;
      }   
    );

    // set the current model to the new one and update its parents
    this.setParents(newState);
    this.model = newState;    
  }

  private getChildLocator(target:any) : ChildLocator {
    var locator: ChildLocator = this.objToParent.get(target);
    return locator;
  }

  private pushHistory() {
    if (this.useHistory) {
      this._history.push(this._model);
    }
  }

  public popHistory() : void {
    if (this.useHistory && this._history.length) {
      this.model = this._history.pop();
    }
  }

  private setParents(obj: any) {
    var parent: any = obj;
    if (typeof obj !== 'object') {
      return;
    }

    for (var key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
        var locator:ChildLocator = new ChildLocator(obj, key);
        this.objToParent.set(obj[key], locator);

        /*
        var lookup = this.getChildLocator(obj[key]);
        if (! lookup) {
          throw 'x';
        }
        if (lookup.parent[lookup.key] !== obj[key]) {
          throw 'y';
        }
        */

        this.setParents(obj[key]);
      }
    }
  }
};

class ChildLocator {
  constructor(public readonly parent: any, public readonly key: string) {
  }
};
