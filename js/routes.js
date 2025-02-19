var routes = [
  {
    path: "/",
    url: "./index.html",
  },
  {
    path: "/order/",
    url: "./pages/order.html",
  },
  {
    path: "/detailed-view/",
    url: "./pages/detailed-view.html",
  },
  {
    path: "/about/",
    url: "./pages/about.html",
  },
  {
    path: "/allergy/",
    url: "./pages/allergy.html",
  },
  {
    path: "/entertainment/",
    url: "./pages/entertainment.html",
  },
  {
    path: "/order-history/",
    url: "./pages/order-history.html",
  },
  {
    path: "/restaurant-info/",
    url: "./pages/restaurant-info.html",
  },
  {
    path: "/diet/",
    url: "./pages/diet.html",
  },
  {
    path: "/form/",
    url: "./pages/form.html",
  },
  {
    path: "/catalog/",
    componentUrl: "./pages/catalog.html",
  },
  {
    path: "/product/:id/",
    componentUrl: "./pages/product.html",
  },
  {
    path: "/settings/",
    url: "./pages/settings.html",
  },
  {
    path: "/order-empty/",
    url: "./pages/order-empty.html",
  },
  {
    path: "/homescreen/",
    url: "./pages/homescreen.html",
  },
  {
    path: "/preorder/",
    url: "./pages/preorder.html",
  },
  {
    path: "/payment/",
    url: "./pages/payment.html",
  },
  {
    path: "/dishoverview/",
    url: "./pages/dishoverview.html",
  },
  {
    path: "/onboarding-1/",
    url: "./pages/onboarding-1.html",
  },
  {
    path: "/onboarding-2/",
    url: "./pages/onboarding-2.html",
  },
  {
    path: "/onboarding-3/",
    url: "./pages/onboarding-3.html",
  },
  {
    path: "/feedback/",
    url: "./pages/feedback.html",
  },
  {
    path: "/order-history/",
    url: "./pages/order-history.html",
  },
  {
    path: "/ttt/",
    url: "./pages/ttt.html",
  },
  {
    path: "/dynamic-route/blog/:blogId/post/:postId/",
    componentUrl: "./pages/dynamic-route.html",
  },
  {
    path: "/request-and-load/user/:userId/",
    async: function ({ router, to, resolve }) {
      // App instance
      var app = router.app;

      // Show Preloader
      app.preloader.show();

      // User ID from request
      var userId = to.params.userId;

      // Simulate Ajax Request
      setTimeout(function () {
        // We got user data from request
        var user = {
          firstName: "Vladimir",
          lastName: "Kharlampidi",
          about: "Hello, i am creator of Framework7! Hope you like it!",
          links: [
            {
              title: "Framework7 Website",
              url: "http://framework7.io",
            },
            {
              title: "Framework7 Forum",
              url: "http://forum.framework7.io",
            },
          ],
        };
        // Hide Preloader
        app.preloader.hide();

        // Resolve route to load page
        resolve(
          {
            componentUrl: "./pages/request-and-load.html",
          },
          {
            props: {
              user: user,
            },
          }
        );
      }, 1000);
    },
  },

  // Default route (404 page). MUST BE THE LAST
  {
    path: "(.*)",
    url: "./pages/404.html",
  },
];
