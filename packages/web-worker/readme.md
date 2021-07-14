# Glue42 Core Service Worker Module

## Overview

@glue42/web-worker is a library, which is designed to be imported into a service worker file. The library enables the advanced notifications functionality of Glue42 Core, which requires a Service Worker.

## Getting Started

The package can be added to a service worker file in two ways. One is by using the `importScripts()` method attached to the `self` global object in the Service Worker scope. The library will then define and attach to the `self` object a number of stateless functions.

The other way is to import the package just like any other JS package in your existing service worker project. Then you can build it and the output should be a single .js file, ready to be registered as a service worker.

## Usage

The library gives access to three functions:
- self.GlueWebWorker or default export - this function initializes the package and registers the necessary event listeners to correctly capture and process notification clicks
- self.openCorePlatform or {openCorePlatform} - this function accepts a url and will open and wait for the platform app to be fully operational
- self.raiseGlueNotification or {raiseGlueNotification} - this function accepts a Glue42 Core notification settings object and will raise the notification.
