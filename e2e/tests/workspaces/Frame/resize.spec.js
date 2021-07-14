describe("resize() Should", () => {
    const basicConfig = {
        children: [
            {
                type: "row",
                children: [
                    {
                        type: "column",
                        children: [
                            {
                                type: "group",
                                children: [
                                    {
                                        type: "window",
                                        appName: "noGlueApp"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: "column",
                        children: [
                            {
                                type: "group",
                                children: [
                                    {
                                        type: "window",
                                        appName: "noGlueApp"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: "column",
                        children: [
                            {
                                type: "group",
                                children: [
                                    {
                                        type: "window",
                                        appName: "noGlueApp"
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    };

    before(() => coreReady);

    let workspace;
    beforeEach(async () => {
        workspace = await glue.workspaces.createWorkspace(basicConfig);
    });

    afterEach(async () => {
        const wsps = await glue.workspaces.getAllWorkspaces();
        await Promise.all(wsps.map((wsp) => wsp.close()));
    });

    it.skip("enlarge the frame when the passed width and height are bigger", async () => {
        const boundsBeforeResize = await workspace.frame.getBounds();

        await workspace.frame.resize({
            width: boundsBeforeResize.width + 10,
            height: boundsBeforeResize.height + 10
        });

        const boundsAfterResize = await workspace.frame.getBounds();

        expect(boundsAfterResize.width).to.eql(boundsBeforeResize.width + 10);
        expect(boundsAfterResize.height).to.eql(boundsBeforeResize.height + 10);
    });

    it.skip("shrink the frame when the passed width and height are smaller", async () => {
        const boundsBeforeResize = await workspace.frame.getBounds();

        await workspace.frame.resize({
            width: boundsBeforeResize.width - 10,
            height: boundsBeforeResize.height - 10
        });

        const boundsAfterResize = await workspace.frame.getBounds();

        expect(boundsAfterResize.width).to.eql(boundsBeforeResize.width - 10);
        expect(boundsAfterResize.height).to.eql(boundsBeforeResize.height - 10);
    });

    it("reject when the width is 0", (done) => {
        workspace.frame.resize({
            width: 0,
        }).then(() => {
            done("Should not resolve")
        }).catch(() => {
            done();
        });
    });

    it("reject when the width is negative", (done) => {
        workspace.frame.resize({
            width: -10,
        }).then(() => {
            done("Should not resolve")
        }).catch(() => {
            done();
        });
    });

    it("reject when the height is 0", (done) => {
        workspace.frame.resize({
            height: 0,
        }).then(() => {
            done("Should not resolve")
        }).catch(() => {
            done();
        });
    });

    it("reject when the height is negative", (done) => {
        workspace.frame.resize({
            height: -10,
        }).then(() => {
            done("Should not resolve")
        }).catch(() => {
            done();
        });
    });
});