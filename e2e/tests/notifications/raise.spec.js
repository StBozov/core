describe("raise ", () => {

    before(() => coreReady);
    afterEach(() => {
        window.sinonSandbox.reset();
        window.notificationsFakeTriggerClick = false;
        if (glue.interop.methods().some((method) => method.name === "testMethod")) {
            return glue.interop.unregister("testMethod");
        }
    });

    it("should resolve", async () => {
        await glue.notifications.raise({ title: "test" });
    });

    [
        { title: "asd" },
        { title: "asd", badge: "http://test.com" },
        { title: "asd", body: "test description" },
        { title: "asd", data: { test: 42 } },
        { title: "asd", dir: "auto" },
        { title: "asd", icon: "http://test.com" },
        { title: "asd", image: "http://test.com" },
        { title: "asd", lang: "EN" },
        { title: "asd", renotify: true },
        { title: "asd", requireInteraction: true },
        { title: "asd", silent: true },
        { title: "asd", tag: "test42" },
        { title: "asd", timestamp: 1209837 },
        { title: "asd", vibrate: [200, 200, 100] }
    ].forEach((input) => {
        it(`should raise native notification with correct options and title: ${JSON.stringify(input)}`, async () => {

            await glue.notifications.raise(input);

            const title = window.notificationConstructorFake.firstArg;
            const settings = window.notificationConstructorFake.lastArg;


            Object.keys(input).forEach((key) => {
                if (key === "title") {
                    expect(input[key]).to.eql(title);
                    return;
                }

                expect(input[key]).to.eql(settings[key]);
            })
        });
    });

    [
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }] },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], badge: "http://test.com" },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], body: "test description" },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], data: { test: 42 } },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], dir: "auto" },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], icon: "http://test.com" },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], image: "http://test.com" },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], lang: "EN" },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], renotify: true },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], requireInteraction: true },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], silent: true },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], tag: "test42" },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], timestamp: 1209837 },
        { title: "asd", actions: [{ action: "one", title: "one", icon: "http://one.com" }], vibrate: [200, 200, 100] }
    ].forEach((input) => {
        it(`should raise service worker notification with correct options and title: ${JSON.stringify(input)}`, async () => {

            await glue.notifications.raise(input);

            const title = window.showNotificationFake.firstArg;
            const settings = window.showNotificationFake.lastArg;

            Object.keys(input).forEach((key) => {
                if (key === "title") {
                    expect(input[key]).to.eql(title);
                    return;
                }

                if (key === "data") {
                    Object.keys(input.data).forEach((dataKey) => {
                        expect(input.data[dataKey]).to.eql(settings.data[dataKey]);
                    });
                    return;
                }

                expect(input[key]).to.eql(settings[key]);
            })
        });
    });

    it("should invoke the onshow handler for native notifications", (done) => {
        glue.notifications.raise({ title: "test" })
            .then((notification) => {
                notification.onshow = () => done();
            })
            .catch(done);
    });

    it("should invoke the onshow handler for service worker notifications", (done) => {
        glue.notifications.raise({ title: "test", actions: [{ action: "one", title: "one", icon: "http://one.com" }] })
            .then((notification) => {
                notification.onshow = () => done();
            })
            .catch(done);
    });

    it("should invoke the onclick handler for native notifications", (done) => {
        window.notificationsFakeTriggerClick = true;

        glue.notifications.raise({ title: "test" })
            .then((notification) => {

                notification.onclick = () => done();
            })
            .catch(done);
    });

    it("should not invoke the onclick handler for native notifications when the notification has not been clicked on", (done) => {
        setTimeout(done, 1500);

        glue.notifications.raise({ title: "test" })
            .then((notification) => {

                notification.onclick = () => done();
            })
            .catch(done);
    });

    it("should invoke the onclick handler for service worker notifications", (done) => {
        const definition = { actions: [{ action: "one", title: "one", icon: "http://one.com" }] };

        glue.notifications.raise(Object.assign({}, definition, { title: "test" }))
            .then((notification) => {
                notification.onclick = () => done();

                const settings = window.showNotificationFake.lastArg;

                const channel = new BroadcastChannel("glue42-core-worker");
                channel.postMessage({ messageType: "notificationClick", glueData: settings.data.glueData, definition });

            })
            .catch(done);
    });

    it("should not invoke the onclick handler for service worker notifications when the notification has not been clicked on", (done) => {
        setTimeout(done, 1500);

        const definition = { actions: [{ action: "one", title: "one", icon: "http://one.com" }] };

        glue.notifications.raise(Object.assign({}, definition, { title: "test" }))
            .then((notification) => {
                notification.onclick = () => done();
            })
            .catch(done);
    });

    it("should invoke a defined method when clickInterop is configured", (done) => {
        const ready = gtf.waitFor(2, done);

        window.notificationsFakeTriggerClick = true;

        glue.interop.register("testMethod", () => ready())
            .then(() => {
                return glue.notifications.raise({ title: "test", clickInterop: { method: "testMethod" } })
            })
            .then(ready)
            .catch(done);

    });

    it("should invoke a defined method with provided args when clickInterop is configured", (done) => {
        const ready = gtf.waitFor(2, done);

        const originalArgs = { test: 42 };

        window.notificationsFakeTriggerClick = true;

        glue.interop.register("testMethod", (args) => {
            try {
                expect(args).to.eql(originalArgs);
                ready()
            } catch (error) {
                done(error);
            }
        })
            .then(() => {
                return glue.notifications.raise({ title: "test", clickInterop: { method: "testMethod", arguments: originalArgs } })
            })
            .then(ready)
            .catch(done);
    });

    it("should invoke a defined method when an action is clicked and defined", (done) => {

        const ready = gtf.waitFor(2, done);

        const definition = { actions: [{ action: "one", title: "one", icon: "http://one.com", interop: { method: "testMethod" } }] };

        glue.interop.register("testMethod", () => ready())
            .then(() => {
                return glue.notifications.raise(Object.assign({}, definition, { title: "test" }))
            })
            .then(() => {
                const settings = window.showNotificationFake.lastArg;

                const channel = new BroadcastChannel("glue42-core-worker");
                channel.postMessage({ action: definition.actions[0].action, messageType: "notificationClick", glueData: settings.data.glueData, definition });

            })
            .then(ready)
            .catch(done);
    });

    it("should invoke a defined method with provided args when an action is clicked and defined", (done) => {
        const ready = gtf.waitFor(2, done);

        const originalArgs = { test: 42 };

        const definition = { actions: [{ action: "one", title: "one", icon: "http://one.com", interop: { method: "testMethod", arguments: originalArgs } }] };

        glue.interop.register("testMethod", (args) => {
            try {
                expect(args).to.eql(originalArgs);
                ready()
            } catch (error) {
                done(error);
            }
        })
            .then(() => {
                return glue.notifications.raise(Object.assign({}, definition, { title: "test" }))
            })
            .then(() => {
                const settings = window.showNotificationFake.lastArg;

                const channel = new BroadcastChannel("glue42-core-worker");
                channel.postMessage({ action: definition.actions[0].action, messageType: "notificationClick", glueData: settings.data.glueData, definition });

            })
            .then(ready)
            .catch(done);
    });

    it("should reject when no title is provided", (done) => {
        glue.notifications.raise()
            .then(() => done("Should not have resolved, because no title was provided"))
            .catch(() => done());
    });

    [
        42,
        "42",
        true,
        ["yes"],
        { title: "asd", badge: true },
        { title: "asd", body: 42 },
        { title: "asd", dir: "please" },
        { title: "asd", icon: ["http://test.com"] },
        { title: "asd", image: { url: "http://test.com" } },
        { title: "asd", lang: true },
        { title: "asd", renotify: "true" },
        { title: "asd", requireInteraction: [true] },
        { title: "asd", silent: { value: true } },
        { title: "asd", tag: 42 },
        { title: "asd", timestamp: "2020" },
        { title: "asd", vibrate: "200, 200, 100" },
        { title: "asd", actions: [{ title: "one", icon: "http://one.com" }] },
        { title: "asd", actions: [{ action: "one", icon: "http://one.com" }] },
        { title: "asd", actions: [{ action: true, title: true, icon: "http://one.com" }] }
    ].forEach((input) => {
        it("should reject when the options are not valid", (done) => {
            glue.notifications.raise(input)
                .then(() => done(`Should not have resolved, because the input is not valid: ${JSON.stringify(input)}`))
                .catch(() => done());
        });
    });

});
