<?php

interface BeforeInterceptorInterface {

	public function __invoke(App $app);

}

interface AfterInterceptorInterface {

	public function __invoke(App $app, Result $result): Result;

}

trait InterceptorTrait {

	public $interceptorBefore;
	public $interceptorAfter;

	public function before(callable $before): self {
		$this->interceptorBefore = $before;

		return $this;
	}

	public function after(callable $after): self {
		$this->interceptorAfter = $after;

		return $this;
	}
}

trait HeaderTrait {

	public $headers = ['Content-Type' => 'text/html'];

	public function getHeader(string $headerName): ?string {
		foreach ($this->headers as $name => $value) {
			if (strtolower($name) == strtolower($headerName)) return $value;
		}

		return null;
	}

	public function setHeader(string $headerName, string $headerValue) {
		$this->headers[$headerName] = $headerValue;
	}

}

class HttpException extends Exception {

	public function __construct(string $message, int $code, Exception $previous = null) {
		parent::__construct($message, $code, $previous);
	}

}

class Helpers {

	public static function redirect(string $url) {
		header('Location: ' . $url);
		exit();
	}

	public static function setRateLimitCookie(int $status, string $name, int $expirationSeconds = 60) {
		if ($status == 200) setcookie($name, true, time() + $expirationSeconds);
	}

	public static function checkRateLimitCookie(App $app, string $name) {
		if (isset($app->cookieParams[$name])) {
			throw new HttpException('Too much requests, please try again later.', 429);
		}
	} 

	public static function sanitize($input) {
		if (is_array($input) && count($input) == 0) return;

		$isAssoc = function (array $arr): bool {
			return array_keys($arr) !== range(0, count($arr) - 1);
		};

		if (is_array($input) && $isAssoc($input)) {
			foreach ($input as $key => $value) {
				$output[$key] = Result::sanitize($value);
			}
		} elseif (is_array($input) && !$isAssoc($input)) {
			foreach ($input as $value) {
				$output[] = Result::sanitize($value);
			}
		} elseif (is_string($input)) {
			$output = htmlentities($input, ENT_QUOTES, 'UTF-8');
		} else {
			throw new HttpException('Sanitizing not possible.', 500);
		}

		return $output;
	}

	public static function getMethodField(string $method = Route::POST) {
		return '<input type="hidden" name="_method" value="' . $method . '" />';

	}

	private static function getCsrfField() {
		Session::start();
		$token = Session::getToken() ?? Session::generateToken();

		return '<input type="hidden" name="_token" value="' . $token . '" />';
	}

	private static function getHoneybotField() {
		return '<input type="checkbox" name="hooman-check" id="hooman-check" aria-hidden="true" tabindex="-1" style="position: absolute; widht: 1px; height: 1px; overflow: hidden;">';
	}

}

class Session {

	public static function start() {
		if (!session_id()) session_start();
	}

	public static function set(string $key, $value) {
		$_SESSION[$key] = $value;
	}

	public static function get(string $key) {
		return (isset($_SESSION[$key])) ? $_SESSION[$key] : false; 
	}

	public static function has(string $key) {
		return isset($_SESSION[$key]); 
	}

	public static function delete(string $key) {
		if (isset($_SESSION[$key])) unset($_SESSION[$key]);
	}

	public static function regenerate() {
		session_regenerate_id();
	}

	public static function destroy() {
		if (session_id()) session_destroy();
	}

	public static function generateToken(string $tokenName = 'token'): string {
		Session::set($tokenName, bin2hex(random_bytes(32)));

		return Session::get($tokenName);
	}

	public static function hasToken(string $tokenName = 'token'): bool {
		if (Session::has($tokenName)) return true;

		return false;
	}

	public static function getToken(string $tokenName = 'token'): ?string {
		if (Session::has($tokenName)) return Session::get($tokenName);

		return null;
	}

	public static function hasValidToken(string $tokenValue, ?string $tokenName = 'token'): bool {
		if (Session::get($tokenName) && hash_equals(Session::get($tokenName), $tokenValue)) {
			return true;
		}

		return false;
	}

	public function hasValidTokenOnce(string $tokenValue, ?string $tokenName = 'token'): bool {
		if (Session::hasValidToken($tokenValue, $tokenName)) {
			Session::delete($tokenName);
			return true;
		}

		return false;
	}

}

class Result {

	use HeaderTrait;

	const SUCCESS = 'success';
	const ERROR   = 'error';
	const INVALID = 'invalid';

	public $body;
	public $status;

	public function __construct($body, int $status = 200, array $headers = []) {
		$this->body = $body;
		$this->status = $status;
		$this->headers = array_merge($this->headers, $headers);
	}

	public static function generateArray(string $result = RESULT::SUCCESS, ?string $message = null, ?array $context = []) {
		if (!$message && $result == Result::SUCCESS) $message = 'OK';

		return [
			'result'  => $result,
			'message' => $message,
			'context' => $context,
		];
	}

}

class Route {

	use InterceptorTrait;

	const GET = 'GET';
    const POST = 'POST';
    const PUT = 'PUT';
    const PATCH = 'PATCH';
    const HEAD = 'HEAD';
    const OPTIONS = 'OPTIONS';
    const DELETE = 'DELETE';

	public $method;
	public $uri;
	public $action;
	public $parameters = [];
	public $onlyRouteInterceptor = false;
	public $excludedAppInterceptors = [];
	public $name;
	public $locale;

	public function __construct(string $method, string $uri, callable $action) {
		if (!in_array(
			$method, [
				Route::GET,
				Route::POST,
				Route::PUT,
				Route::PATCH,
				Route::HEAD,
				Route::OPTIONS,
				Route::DELETE
			])
		) {
			throw new HttpException('Route Method not supported.', 400);
		}

		$this->method = $method;
		$this->uri    = $uri;
		$this->action = $action;
	}

	public function withOnlyRouteInterceptor(): Route {
		$this->onlyRouteInterceptor = true;

		return $this;
	}

	public function withoutAppInterceptor(...$names) {
		$this->excludedAppInterceptors = $names;

		return $this;
	}

	public function isAppInterceptorExcluded(string $name): bool {
		return in_array($name, $this->excludedAppInterceptors);
	}

	public function withName(string $name): Route {
		$this->name = $name;

		return $this;
	}

	public function withLocale(string $locale): Route {
		$this->locale = $locale;

		return $this;
	}

}

class Router {

	public $contextPath;
	public $locales = [];

	private $routes = [];

	public function __call(string $name, array $arguments): Route {
		$method = strtoupper($name);
		$uri = $arguments[0];
		$callable = $arguments[1];

		if ($this->contextPath) $uri = '/' . trim($this->contextPath, '/\\') . $uri;

		$this->routes[$method][] = new Route($method, $uri, $callable);
		return end($this->routes[$method]);
	}

	public function getRoute(string $requestedMethod, string $requestedUri): ?Route {
		if (empty($this->routes) || empty($this->routes[$requestedMethod])) return null;

		$route = null;
		foreach ($this->routes[$requestedMethod] as $possibleRoute) {
			$uriPattern = $possibleRoute->uri;

			// Remove leading and trailing slashes (if present) and add it again.
			$requestedUri = trim($requestedUri, '/\\');
			$uriPattern   = trim($uriPattern,   '/\\');
			$requestedUri = '/' . $requestedUri . '/';
			$uriPattern   = '/' . $uriPattern   . '/';


			if (!empty($this->locales)) {
				// Replace locale patterns with regex.
				$uriPattern = str_replace('/{locale}',  '(\/' . implode('|\/', $this->locales) . ')',  $uriPattern, $localeReplaced);
				$uriPattern = str_replace('/{locale?}', '(\/' . implode('|\/', $this->locales) . ')?', $uriPattern, $localeOptionalReplaced);
			}

			// Replace patterns with regex.
			$uriPattern = str_replace('/{any}',  '\/([A-Za-z0-9_-]+)',   $uriPattern);
			$uriPattern = str_replace('/{any?}', '\/?([A-Za-z0-9_-]+)?', $uriPattern);
			$uriPattern = str_replace('/{num}',  '\/(\d+)',   $uriPattern);
			$uriPattern = str_replace('/{num?}', '\/?(\d+)?', $uriPattern);

			$routeMatch = preg_match('(^' . $uriPattern . '$)i', $requestedUri, $parameters);

			if (isset($routeMatch) && $routeMatch) {
				$route = $possibleRoute;

				// Remove first element of parameters, because it is the requested route.
				array_shift($parameters);

				$routeParameters = [];

				foreach ($parameters as $key => $parameter) {
					// Remove empty parameter
					if (empty($parameter)) continue;

					// If parameter starts with '/' it must be the locale
					if (substr($parameter, 0, 1) === '/') {
						$locale = ltrim($parameter, '/');
						if ($locale && !$route->locale) $route->locale = $locale;
						continue;
					}

					$routeParameters[] = $parameter;
				}

				$route->parameters = $routeParameters;

				break;
			}
		}

		return $route;
	}

}

class App extends Router {

	use InterceptorTrait;
	use HeaderTrait;

	public $host;
	public $fullUrl;
	public $queryParams = [];
	public $parsedBody = [];
	public $uploadedFiles = [];
	public $cookieParams = [];
	public $body = null;

	public $method;
	public $uri;
	public $route;

	public function __construct() {
		$this->loadEnv('.env');
		$this->init();
	}

	public function loadEnv(string $filePath) {
		if (file_exists($filePath)) {
			$file = fopen($filePath, 'r');

			while (($line = fgets($file)) !== false) {
				putenv(trim($line));
			}

			fclose($file);
		}
	}

	public function run() {
		$route = $this->getRoute($this->method, $this->uri);
		if (!$route) throw new HttpException('Not Found.', 404);
		$this->route = $route;

		if (!$route->onlyRouteInterceptor && $this->interceptorBefore) ($this->interceptorBefore)($this);
		if ($route->interceptorBefore) ($route->interceptorBefore)($this);

		$result = ($route->action)(...$route->parameters);
		if (!$result instanceof Result) $result = new Result($result);

		if ($route->interceptorAfter) $result = ($route->interceptorAfter)($this, $result);
		if (!$route->onlyRouteInterceptor && $this->interceptorAfter) $result = ($this->interceptorAfter)($this, $result);

		$this->render($result);
	}

	public function exceptionHandler(Exception $e) {
		$isDebugMode = getEnv('DEBUG') && getEnv('DEBUG') == 'true';
		$result = new Result('<h1>Internal Server Error</h1>', 500, ['Content-Type', 'text/html; charset=utf-8']);

		if (is_int($e->getCode())) {
			$result->status = $e->getCode() > 0 ? $e->getCode() : 500;
		}

		if ($result->status == 404) {
			$result->body = '<h1>Not Found</h1>';
		} else {
			if ($isDebugMode) {
				$result->body .= '<p>' . $e->getMessage() . '</p><p>' . $e->getTraceAsString() . '</p>' . $e;
			}
		}

		if (
			$this->getHeader('Accept') == 'application/json' 
			|| $this->getHeader('Content-Type') == 'application/json'
		) {
			if ($isDebugMode) {
				$context = [
					'exception' => $e,
					'trace' => $e->getTraceAsString(),
				];
			}

			$result->body = Result::generateArray(
				Result::ERROR,
				$e->getMessage(),
				$context ?? [],
			);
		}

		$this->render($result);
	}

	private function init() {
		set_exception_handler([$this, 'exceptionHandler']);

		if (getEnv('DEBUG') && getEnv('DEBUG') == 'true') error_reporting(E_ALL);

		$requestMethod = Route::GET;
		if (isset($_POST['_method'])) {
			$requestMethod = $_POST['_method'];
		} elseif ($_SERVER['REQUEST_METHOD']) {
			$requestMethod = $_SERVER['REQUEST_METHOD'];
		}

		$originalHeaders = getallheaders();
		$lowercasedHeaders = [];
		foreach ($originalHeaders as $name => $value) {
			$lowercasedHeaders[strtolower($name)] = $value;
		}

		$this->contextPath = getenv('APP_CONTEXT_PATH');

		$this->method = $requestMethod;
		$this->uri = $_SERVER['REQUEST_URI'];
		$this->headers = $originalHeaders;

		$this->host = $_SERVER['HTTP_HOST'];
		$this->fullUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . "://{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}";
		$this->queryParams = $_GET;
		$this->parsedBody = $_POST;
		$this->uploadedFiles = $_FILES;
		$this->cookieParams = $_COOKIE;
		$this->body = file_get_contents('php://input', 'r') ?: null;
	}

	public function render(Result $result) {
		$body = $result->body;
		$output = '';

		if (is_null($body)) {
			$output = '';
		} else if (is_string($body) || (is_object($body) && method_exists($body , '__toString'))) {
			$output = $body;
		} else if (is_object($body) || is_array($body)) {
			if (strpos($result->getHeader('Content-Type'), 'application/json') === false) {
				$result->setHeader('Content-Type', 'application/json');
			}

			$output = json_encode($body);
		} else {
			throw new HttpException('Action returns wrong type.', 500);
		}

		http_response_code($result->status);

		foreach ($result->headers as $name => $value) {
			header($name . ': ' . $value);
		}

		echo $output;
	}

}

class AppBeforeInterceptor implements BeforeInterceptorInterface {

	protected $csrfTokenHeader = 'X-CSRF-TOKEN';
	protected $csrfTokenName = '_token';

	protected $xssFilterExceptions = [
		'password',
		'password-confirmation',
		'password-new',
	];
	protected $xssFilterAllowedTags = ''; // E. g. '<strong>,<em>'

	private $app;

	public function __invoke(App $app) {
		$this->app = $app;

		if (!$this->app->route->isAppInterceptorExcluded('allowed-domains')) {
			$this->checkAllowedDomains();
		}

		if (!$this->app->route->isAppInterceptorExcluded('csrf')) {
			$this->checkCsrfToken();
		}

		if (!$this->app->route->isAppInterceptorExcluded('xss-filter')) {
			$this->filterBodyValues();
		}

		// Store JWT in Cookie (samesite strict, httpOnly, [secure if not dev])
		// Read cookie in Before interceptor, set Bearer Header with JWT
	}

	private function checkAllowedDomains() {
		if (getenv('APP_CORS')) {
			$allowedHosts = array_map(function ($allowedOrigin) {
				return parse_url($allowedOrigin)['host'];
			}, explode(',', getenv('APP_CORS')));

			$key = array_search($this->app->host, $allowedHosts);

			if ($key === false) throw new HttpException('Allowed Domain Violation.', 400);
		}
	}

	private function checkCsrfToken() {
		if (
			$this->app->getHeader('Content-Type') != 'application/x-www-form-urlencoded'
			&& $this->app->getHeader('Content-Type') != 'multipart/form-data'
			&& $this->app->getHeader('Content-Type') != 'text/plain'
		) return;

		if (
			$this->app->method != Route::POST
			&& $this->app->method != Route::PUT
			&& $this->app->method != Route::PATCH
			&& $this->app->method != Route::DELETE
		) return;

		Session::start();

		$token = $this->app->getHeader($this->csrfTokenHeader)
			? $this->app->getHeader($this->csrfTokenHeader)
			: $this->app->parsedBody[$this->csrfTokenName] ?? null;

		if (!$token || !Session::hasValidToken($token)) {
			throw new HttpException('CSRF Violation', 400);
		}
	}

	private function filterBodyValues() {
		$contentType = explode(';', $this->app->getHeader('Content-Type'))[0];

		if ($contentType == 'application/x-www-form-urlencoded' || $contentType == 'multipart/form-data') {
			$post = $this->app->parsedBody;

			foreach ($post as $key => $value) {
				if (!in_array($key, $this->xssFilterExceptions, true)) {
					$post[$key] = trim(strip_tags($value, $this->xssFilterAllowedTags));
				}
			}

			$_POST = $post;
			$this->app->parsedBody = $post;
		}
	}

}

class AppAfterInterceptor implements AfterInterceptorInterface {

	private $app;
	private $result;

	public function __invoke(App $app, Result $result): Result {
		$this->app = $app;
		$this->result = $result;

		if (!$this->app->route->isAppInterceptorExcluded('charset')) {
			$this->applyCharset();
		}

		if (!$this->app->route->isAppInterceptorExcluded('cors')) {
			$this->applyCorsHeaders();
		}

		if (!$this->app->route->isAppInterceptorExcluded('security-headers')) {
			$this->applySecurityHeaders();
		}

		return $this->result;
	}

	private function applyCharset() {
		if ($this->result->getHeader('Content-Type') !== 'text/html') return;

		$this->result->setHeader('Content-Type', "text/html; charset=utf-8");
	}

	private function applyCorsHeaders() {
		if (getenv('APP_CORS')) {
			$allowedOrigins = explode(',', getenv('APP_CORS'));

			if ($this->app->getHeader('Origin')) {
				$origin = $this->app->getHeader('Origin');
				$key = array_search($origin, $allowedOrigins);

				if (strpos($origin, '://') === false || $key === false) {
					throw new HttpException('CORS Violation.', 400);
				}

				$this->result->setHeader('Access-Control-Allow-Origin', $allowedOrigins[$key]);
				$this->result->setHeader('Access-Control-Allow-Credentials', 'true');
				$this->result->setHeader('Access-Control-Max-Age', '86400'); // Cache one day
			}
		}

		$this->result->setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, HEAD, OPTIONS');
	}

	private function applySecurityHeaders() {
		if (getenv('APP_CSP')) {
			$this->result->setHeader('Content-Security-Policy', getenv('APP_CSP'));
		}

		$this->result->setHeader('Referrer-Policy', 'same-origin');
		$this->result->setHeader('Strict-Transport-Security', 'max-age=7884000; includeSubDomains');
		$this->result->setHeader('X-Content-Type-Options', 'nosniff');
		$this->result->setHeader('X-Frame-Options', 'sameorigin');
		$this->result->setHeader('X-XSS-Protection', '1; mode=block');
	}

}

return (function () {
	$app = new App();

	$app->before(new AppBeforeInterceptor());
	$app->after(new AppAfterInterceptor());

	return $app;
})();
