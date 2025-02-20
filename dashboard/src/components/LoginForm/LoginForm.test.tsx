import LoadingWrapper from "components/LoadingWrapper";
import { Location } from "history";
import { act } from "react-dom/test-utils";
import { Redirect } from "react-router";
import { defaultStore, mountWrapper } from "shared/specs/mountWrapper";
import LoginForm from "./LoginForm";
import OAuthLogin from "./OauthLogin";
import TokenLogin from "./TokenLogin";

const emptyLocation: Location = {
  hash: "",
  pathname: "",
  search: "",
  state: "",
  key: "",
};

const defaultCluster = "default";

const defaultProps = {
  cluster: defaultCluster,
  authenticate: jest.fn(),
  authenticated: false,
  authenticating: false,
  authenticationError: undefined,
  location: emptyLocation,
  checkCookieAuthentication: jest.fn().mockReturnValue({
    then: jest.fn(f => f()),
  }),
  oauthLoginURI: "",
  appVersion: "devel",
  authProxySkipLoginPage: false,
};

const authenticationError = "it's a trap";

describe("while authenticating", () => {
  it("behaves like a loading component", () => {
    const props = {
      ...defaultProps,
      authenticating: true,
    };
    const wrapper = mountWrapper(defaultStore, <LoginForm {...props} />);
    expect(wrapper.find(LoadingWrapper)).toExist();
    expect(wrapper.find(TokenLogin)).not.toExist();
    expect(wrapper.find(OAuthLogin)).not.toExist();
  });
});

describe("token login form", () => {
  it("renders a token login form", () => {
    const wrapper = mountWrapper(defaultStore, <LoginForm {...defaultProps} />);
    expect(wrapper.find(TokenLogin)).toExist();
    expect(wrapper.find(OAuthLogin)).not.toExist();
  });

  it("renders a link to the access control documentation", () => {
    const wrapper = mountWrapper(defaultStore, <LoginForm {...defaultProps} />);
    expect(wrapper.find("a").props()).toMatchObject({
      href: "https://github.com/kubeapps/kubeapps/blob/devel/docs/user/access-control.md",
      target: "_blank",
    });
  });

  it("updates the token in the state when the input is changed", () => {
    const wrapper = mountWrapper(defaultStore, <LoginForm {...defaultProps} />);
    let input = wrapper.find("input#token");
    act(() => {
      input.simulate("change", {
        target: { value: "f00b4r" },
        current: { value: "ff00b4r" },
      });
    });
    wrapper.update();
    input = wrapper.find("input#token");
    expect(input.prop("value")).toBe("f00b4r");
  });

  describe("redirect if authenticated", () => {
    it("redirects to / if no current location", () => {
      const wrapper = mountWrapper(
        defaultStore,
        <LoginForm {...defaultProps} authenticated={true} />,
      );
      const redirect = wrapper.find(Redirect);
      expect(redirect.props()).toEqual({ to: { pathname: "/" } });
    });

    it("redirects to previous location", () => {
      const location = Object.assign({}, emptyLocation);
      location.state = { from: "/test" };
      const wrapper = mountWrapper(
        defaultStore,
        <LoginForm {...defaultProps} authenticated={true} location={location} />,
      );
      const redirect = wrapper.find(Redirect);
      expect(redirect.props()).toEqual({ to: "/test" });
    });
  });

  it("calls the authenticate handler when the form is submitted", () => {
    const authenticate = jest.fn();
    const wrapper = mountWrapper(
      defaultStore,
      <LoginForm {...defaultProps} authenticate={authenticate} />,
    );
    act(() => {
      wrapper.find("input#token").simulate("change", { target: { value: "f00b4r" } });
    });
    act(() => {
      wrapper.find("form").simulate("submit", { preventDefault: jest.fn() });
    });
    expect(authenticate).toBeCalledWith(defaultCluster, "f00b4r");
  });

  it("displays an error if the authentication error is passed", () => {
    const wrapper = mountWrapper(
      defaultStore,
      <LoginForm {...defaultProps} authenticationError={authenticationError} />,
    );

    expect(wrapper.find(".error").exists()).toBe(true);
  });

  it("does not display the oauth login if oauthLoginURI provided", () => {
    const props = {
      ...defaultProps,
      oauthLoginURI: "",
    };

    const wrapper = mountWrapper(defaultStore, <LoginForm {...props} />);

    expect(wrapper.find("a.button").exists()).toBe(false);
  });
});

describe("oauth login form", () => {
  const props = {
    ...defaultProps,
    oauthLoginURI: "/sign/in",
  };
  it("does not display the token login if oauthLoginURI provided", () => {
    const wrapper = mountWrapper(defaultStore, <LoginForm {...props} />);

    expect(wrapper.find("input#token").exists()).toBe(false);
  });

  it("displays the oauth login if oauthLoginURI provided", () => {
    const wrapper = mountWrapper(defaultStore, <LoginForm {...props} />);
    expect(props.checkCookieAuthentication).toHaveBeenCalled();
    expect(wrapper.find(OAuthLogin)).toExist();
    expect(wrapper.find("a").findWhere(a => a.prop("href") === props.oauthLoginURI)).toExist();
  });

  it("doesn't render the login form if the cookie has not been checked yet", () => {
    const props2 = {
      ...props,
      checkCookieAuthentication: jest.fn().mockReturnValue({
        then: jest.fn(() => false),
      }),
    };
    const wrapper = mountWrapper(defaultStore, <LoginForm {...props2} />);
    expect(wrapper.find(LoadingWrapper)).toExist();
    expect(wrapper.find(OAuthLogin)).not.toExist();
  });

  it("changes window location when skipping oauth login page", () => {
    // After the JSDOM upgrade, window.xxx are read-only properties
    // https://github.com/facebook/jest/issues/9471
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { replace: jest.fn() },
    });
    mountWrapper(defaultStore, <LoginForm {...props} authProxySkipLoginPage={true} />);
    expect(window.location.replace).toHaveBeenCalledWith(props.oauthLoginURI);
  });
});
