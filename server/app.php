<?php

namespace App;

use \Closure;
use \Exception;
use \finfo;
use \JsonSerializable;
use \PDO;
use \PDOException;
use \ReflectionClass;
use \ReflectionException;
use \Throwable;

trait EnvTrait {

	public function loadEnv(string $filePath) {
		if (file_exists($filePath)) {
			$file = fopen($filePath, 'r');

			while (($line = fgets($file)) !== false) {
				putenv(trim($line));
			}

			fclose($file);
		}
	}

}

trait DITrait {

	/** @var array Mapped entries. */
	protected $mappedEntries = [];

	/** @var array Binded parameters applied on class creation. */
	protected $bindedParams = [];

	/** @var array List of shared instances. */
	protected $sharedEntries = [];

	/**
	 * Set a shared instance that is always injected when the class is requested.
	 *
	 * @param string $id       Identifier or class for the instance.
	 * @param mixed  $instance The instance of the identifier or class.
	 */
	public function set(string $id, $instance = null) {
		$this->sharedEntries[$id] = $instance;
	}

	/**
	 * Map a class name to another class name, e. g. an Interface to an implementation.
	 *
	 * @param string $fromClass The requested class.
	 * @param string $toClass   The implementation that should be returned from the container.
	 */
	public function map(string $fromClass, string $toClass) {
		$this->mappedEntries[$fromClass] = $toClass;
	}

	/**
	 * Bind parameters to class.
	 *
	 * @param string $id          Identifier or class name (FQCN) for class to bind parameters.
	 * @param array  $parameters  (optional) Parameters for class as value array.
	 * @param array  $identifiers (optional) Identifiers to bind more classes.
	 */
	public function bind(string $id, ?array $parameters = []) {
		$this->bindedParams[$id] = $parameters;
	}

	/**
	 * Finds an entry of the container by its identifier and returns it.
	 *
	 * @param string $id Identifier of the entry to look for.
	 *
	 * @throws ExceptionInterface  No entry was found for **this** identifier.
	 * @throws ContainerExceptionInterface Error while retrieving the entry.
	 *
	 * @return mixed Entry.
	 */
	public function get($id) {
		if ($this->has($id)) return $this->resolve($id);

		throw new Exception('No entry or class found for "' . $id . '".');
	}

	/**
	 * Returns true if the container can return an entry for the given identifier.
	 * Returns false otherwise.
	 *
	 * `has($id)` returning true does not mean that `get($id)` will not throw an exception.
	 * It does however mean that `get($id)` will not throw a `ExceptionInterface`.
	 *
	 * @param string $id Identifier of the entry to look for.
	 *
	 * @return bool
	 */
	public function has($id) {
		return class_exists($id);
	}

	/**
	 * Resolve class dependencies.
	 *
	 * Does only work with class parameters.
	 * No check for isArray(), isCallable(), isDefaultValueAvailable(),
	 * isOptional(), etc. if parameter is not a class.
	 * 
	 * @param string $id Class to resolve.
	 * 
	 * @return object Object of class.
	 */
	public function resolve(string $id) {
		if (isset($this->mappedEntries[$id])) $id = $this->mappedEntries[$id];
		if (isset($this->sharedEntries[$id])) return $this->sharedEntries[$id];

		try {
			$reflectionClass = new ReflectionClass($id);
		} catch (ReflectionException $e) {
			exit($e->getMessage());
		}

		$namespace = $reflectionClass->getNamespaceName();
		$constructor = $reflectionClass->getConstructor();

		if (!$constructor || !$constructor->getParameters()) {
			// Class has no constructor, just create and return it.
			$instance = new $id;
			if (isset($this->sharedEntries[$id])) $this->sharedEntries[$id] = $instance;
			return $instance;
		}

		$parameters = $constructor->getParameters();
		$dependencies = [];

		$bindedParams = isset($this->bindedParams[$id]) ? $this->bindedParams[$id] : null;	

		// Loop over constructor parameters.
		foreach ($parameters as $parameter) {
			try {
				// If parameter belongs to binded class with parameter.
				if (isset($bindedParams)) {
					if (isset($bindedParams[$parameter->getPosition()])) {
						// Set parameter
						$dependencies[] = $bindedParams[$parameter->getPosition()];
						continue;
					} elseif ($parameter->isOptional()) {
						// If no parameter given, but parameter is optional.
						if ($parameter->getDefaultValue()) {
							$dependencies[] = $parameter->getDefaultValue();
						} else {
							$dependencies[] = null;
						}

						continue;
					} else {
						// If no parameter given and parameter not optional.
						throw new ReflectionException('Error binding parameters to class "' . $id . '".');
					}

					continue;
				}
			} catch (ReflectionException $e) {
				exit($e->getMessage());
			}

			// Parameter is not a class.
			if (is_null($this->getParameterClassName($parameter))) {
				$dependencies[] = null;
				continue;
			}

			// Parameter is a class dependency, recursively call resolve().
			$dependencies[] = $this->resolve(
				$parameter->getType()->getName()
			);
		}

		// Return reflected class, instantiated with all dependencies.
		$instance = $reflectionClass->newInstanceArgs($dependencies);
		if (isset($this->sharedEntries[$id])) $this->sharedEntries[$id] = $instance;
		return $instance;
	}

	/**
	 * From Laravel "Illuminate/Container/Util.php"
	 *
	 * Get the class name of the given parameter's type, if possible.
	 *
	 * From Reflector::getParameterClassName() in Illuminate\Support.
	 *
	 * @param  \ReflectionParameter  $parameter
	 * @return string|null
	 */
	private function getParameterClassName($parameter) {
		$type = $parameter->getType();

		return ($type && !$type->isBuiltin()) ? $type->getName() : null;
	}

}

trait InterceptorTrait {

	private $interceptorBefore;
	private $interceptorAfter;

	public function before(callable $before): self {
		$this->interceptorBefore = $before;

		return $this;
	}

	public function getInterceptorBefore() {
		return $this->interceptorBefore;
	}

	public function after(callable $after): self {
		$this->interceptorAfter = $after;

		return $this;
	}

	public function getInterceptorAfter() {
		return $this->interceptorAfter;
	}

}

trait HeaderTrait {

	private array $headers = [];

	public function initHeadersFromRequest() {
		$this->headers = getallheaders();
	}

	public function getHeaders(): array {
		return $this->headers;
	}

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

trait PredefinedVariablesTrait {

	private string $method;
	private string $uri;
	private string $host;
	private string $fullUrl;
	private array $queryParams = [];
	private array $parsedBody = [];
	private array $uploadedFiles = [];
	private array $cookieParams = [];
	private string|false|null $body = null;

	public function initPredefinedVariables() {
		$this->method = $_POST['_method'] ?? $_SERVER['REQUEST_METHOD'] ?? 'GET';
		$this->uri = $_SERVER['REQUEST_URI'];
		$this->host = $_SERVER['HTTP_HOST'];
		$this->fullUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . "://{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}";
		$this->queryParams = $_GET;
		$this->parsedBody = $_POST;
		$this->uploadedFiles = $_FILES;
		$this->cookieParams = $_COOKIE;
		$this->body = file_get_contents('php://input', 'r') ?: null;
	}

	public function getMethod(): string {
		return $this->method;
	}

	public function getUri(): string {
		return $this->uri;
	}

	public function getUriPath(): ?string {
		$parts = parse_url($this->uri);
		return $parts['path'] ?? null;
	}

	public function getUriQueryString(): ?string {
		$parts = parse_url($this->uri);
		return $parts['query'] ?? null;
	}

	public function getUriFragment(): ?string {
		$parts = parse_url($this->uri);
		return $parts['fragment'] ?? null;
	}

	public function getHost(): string {
		return $this->host;
	}

	public function getFullUrl(): string {
		return $this->fullUrl;
	}

	public function getQueryParams(): array {
		return $this->queryParams;
	}

	public function setParsedBody(array $parsedBody) {
		$this->parsedBody = $parsedBody;
	}

	public function getParsedBody(): array {
		return $this->parsedBody;
	}

	public function getUploadedFiles(): array {
		return $this->uploadedFiles;
	}

	public function getCookieParams(): array {
		return $this->cookieParams;
	}

	public function getBody(): string|false|null {
		return $this->body;
	}

}

trait ValueTrait {

	private array $value = [];

	public function setValue(string $name, mixed $value) {
		$this->value[$name] = $value;
	}

	public function getValue(string $name) {
		if (!isset($this->value[$name])) return;

		return $this->value[$name];
	}

}

trait SanitizerTrait {

	public function sanitize(ActiveRecord|array|string|null $input) {
		if (is_array($input) && count($input) == 0) return;
		if (is_null($input)) return;

		$isAssoc = function (array $arr): bool {
			return array_keys($arr) !== range(0, count($arr) - 1);
		};

		if ($input instanceof ActiveRecord) {
			$input->iterateData(function ($key, &$value) {
				$value = $this->sanitize($value);
			});

			$output = $input;
		} elseif (is_array($input) && $isAssoc($input)) {
			foreach ($input as $key => $value) {
				$output[$key] = $this->sanitize($value);
			}
		} elseif (is_array($input) && !$isAssoc($input)) {
			foreach ($input as $value) {
				$output[] = $this->sanitize($value);
			}
		} elseif (is_string($input)) {
			$output = htmlentities($input, ENT_QUOTES, 'UTF-8');
		} else {
			throw new HttpException('Sanitizing not possible.', 500);
		}

		return $output;
	}

}

class HttpException extends Exception {

	public function __construct(string $message, int $code, Exception $previous = null) {
		parent::__construct($message, $code, $previous);
	}

}

class TemplateRenderException extends Exception {}

class I18n {

	private array $lines = [];
	private string $locale = 'en';

	public function load(string $file, ?string $locale = 'en') {
		$lines = include $file;
		if (!isset($this->lines[$locale])) $this->lines[$locale] = [];
		$this->lines[$locale] = array_merge($this->lines[$locale], $lines);
		$this->locale = $locale;
	}

	public function setLocale(string $locale) {
		$this->locale = $locale;
	}

	public function getLocale(): string {
		return $this->locale;
	}

	public function get(string $line, ?string $fallback = null, ...$args): string {
		$i18nString = '';

		if (empty($this->locale)) {
			if (isset($fallback)) {
				$i18nString = $fallback;
			} else {
				$i18nString = $line;
			}
		} elseif (isset($this->lines[$this->locale])) {
			if (array_key_exists($line, $this->lines[$this->locale])) {
				$i18nString = $this->lines[$this->locale][$line];
			} elseif (isset($fallback)) {
				$i18nString = $fallback;
			} else {
				$i18nString = $line;
			}
		} elseif (isset($fallback)) {
			$i18nString = $fallback;
		} else {
			$i18nString = $line;
		}

		$placeholders = [];
		foreach ($args as $key => $value) {
			$placeholders[] = '{' . $key . '}';
		}

		return str_replace($placeholders, $args, $i18nString);
	}

}

class Helpers {

	public static function registerAutoload() {
		spl_autoload_register(function (string $class) {
			$classFile = str_replace('\\', '/', $class) . '.php';
			if (file_exists($classFile)) require $classFile;
		});
	}

	public static function redirect(string $url) {
		header('Location: ' . $url);
		exit();
	}

	public static function setRateLimitCookie(int $status, string $name, int $expirationSeconds = 60, int $maxTries = 5) {
		$triesTime = Session::get($name . '-tries-time') ?? time();

		if (time() > ($triesTime + $expirationSeconds)) {
			Session::delete($name . '-tries-number');
			Session::delete($name . '-tries-time');
		}

		$triesNumber = Session::get($name . '-tries-number') ?? 1;
		$triesTime = Session::get($name . '-tries-time') ?? time();

		if ($triesNumber < $maxTries) {
			Session::set($name . '-tries-number', $triesNumber + 1);
			Session::set($name . '-tries-time', time());
			return;
		}

		if ($status == 200) {
			Session::delete($name . '-tries-number');
			Session::delete($name . '-tries-time');
			setcookie($name, true, time() + $expirationSeconds);
		}
	}

	public static function checkRateLimitCookie(App $app, string $name) {
		if (isset($app->getCookieParams()[$name])) {
			Session::delete($name . '-tries-number');
			Session::delete($name . '-tries-time');
			throw new HttpException('Too much requests, please try again later.', 429);
		}
	}

}

// @todo Session Cookie Security
class Session {

	public static function start() {
		if (!session_id()) session_start();
	}

	public static function set(string $key, $value) {
		$_SESSION[$key] = $value;
	}

	public static function get(string $key) {
		return (isset($_SESSION[$key])) ? $_SESSION[$key] : null; 
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

	public static function hasValidTokenOnce(string $tokenValue, ?string $tokenName = 'token'): bool {
		if (Session::hasValidToken($tokenValue, $tokenName)) {
			Session::delete($tokenName);
			return true;
		}

		return false;
	}

	public static function flash(string $key, $value) {
		$flash = Session::get('flash');
		if (!$flash) $flash = [];

		$flash[$key] = $value;

		Session::set('flash', $flash);
	}

	public static function hasFlash($key): bool {
		$flash = Session::get('flash');
		if (!$flash) return false;
		if (!$flash[$key]) return false;

		return true;
	}

	public static function getFlash($key) {
		$flash = Session::get('flash');
		if (!$flash) return;
		if (!$flash[$key]) return;

		$message = $flash[$key];
		unset($flash[$key]);

		Session::set('flash', $flash);

		return $message;
	}

}

class Validator {

	private string $name;
	private mixed $value;
	private bool $isFile;

	private array $errors = [];

	public function field(string $name, $value = null, $isFile = false): self {
		$this->name = $name;
		$this->value = $value;
		$this->isFile = $isFile;

		return $this;
	}

	public function text(): self {
		return $this;
	}

	public function equals(mixed $value): self {
		if ($this->value !== $value && !empty($this->value)) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	public function inList(mixed ...$values): self {
		if (!in_array($this->value, $values)) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	public function email(): self {
		if (!filter_var($this->value, FILTER_VALIDATE_EMAIL) && !empty($this->value)) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	public function domain(): self {
		if (!filter_var($this->value, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) && !empty($this->value)) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	public function url(): self {
		if (!filter_var($this->value, FILTER_VALIDATE_URL) && !empty($this->value)) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	public function number(): self {
		if (!is_numeric($this->value) && !empty($this->value)) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	public function minMaxString(?int $min, ?int $max = null): self {
		$notInRange = false;
		$value = $this->value;

		if (!empty($value)) {
			if (isset($min) && strlen($value) < $min) $notInRange = true;
			if (isset($max) && strlen($value) > $max) $notInRange = true;
		}

		if ($notInRange) $this->setError(__FUNCTION__);

		return $this;
	}

	public function minMaxNumber(?int $min, ?int $max = null): self {
		$notInRange = false;
		$value = $this->value;

		if (is_numeric($value)) {
			if (isset($min) && $value < $min) $notInRange = true;
			if (isset($max) && $value > $max) $notInRange = true;
		} else {
			$notInRange = true;
		}

		if ($notInRange) $this->setError(__FUNCTION__);

		return $this;
	}

	public function minMaxFile(?int $min, ?int $max = null): self {
		$notInRange = false;
		$value = $this->value;

		// File Array
		if ($this->isFile && is_array($this->value[$this->name]['name'])) {
			$value = count($this->value[$this->name]['name']);

			if (is_numeric($value)) {
				if (isset($min) && $value < $min) $notInRange = true;
				if (isset($max) && $value > $max) $notInRange = true;
			} else {
				$notInRange = true;
			}
		} else {
			$notInRange = true;
		}

		if ($notInRange) $this->setError(__FUNCTION__);

		return $this;
	}

	public function ip(): self {
		if (!filter_var($this->value, FILTER_VALIDATE_IP) && !empty($this->value)) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	// True: 1, true, "true", "on", "yes"
	// False: 0, false, "false", "off", "no"
	public function boolean(): self {
		if (is_null(filter_var($this->value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE))) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	public function pattern($pattern): self {
		if (!filter_var($this->value, FILTER_VALIDATE_REGEXP, [ 'options' => [ 'regexp' => $pattern ] ]) && !empty($this->value)) {
			$this->setError(__FUNCTION__);
		}

		return $this;
	}

	public function required(): self {
		if (is_null($this->value)) {
			$this->setError(__FUNCTION__);
			return $this;
		}

		if (is_array($this->value) && empty($this->value)) {
			$this->setError(__FUNCTION__);
			return $this;
		}

		if ($this->isFile && is_array($this->value[$this->name]['name'])) {
			// File Array
			foreach ($this->value[$this->name]['error'] as $key => $fileError) {
				if ($fileError === UPLOAD_ERR_NO_FILE) {
					$this->setError(__FUNCTION__, $this->value['name'][$key]);
				}
			}
		} elseif ($this->isFile) {
			// File
			if ($this->value[$this->name]['error'] === UPLOAD_ERR_NO_FILE) {
				$this->setError(__FUNCTION__);
			}
		} else {
			// Field
			if ($this->value === '') {
				$this->setError(__FUNCTION__);
			}
		}

		return $this;
	}

	public function notNull(): self {
		if (is_null($this->value)) $this->setError(__FUNCTION__);
		return $this;
	}

	// $size in bytes (1 MB = 1024 * 1024 * 1)
	public function maxSize(int $size): self {
		if ($this->isFile && is_array($this->value[$this->name]['name'])) {
			// File Array
			foreach ($this->value[$this->name]['name'] as $key => $fileName) {
				if ($this->value[$this->name]['error'][$key] === UPLOAD_ERR_INI_SIZE 
					|| $this->value[$this->name]['error'][$key] === UPLOAD_ERR_FORM_SIZE 
				 	|| $this->value[$this->name]['size'][$key] > $size
				) {
					$this->setError('fileSize', $fileName . ' (' . $this->value[$this->name]['size'][$key] . ')');
				}
			}
		} elseif ($this->isFile) {
			// File
			if ($this->value[$this->name]['error'] === UPLOAD_ERR_INI_SIZE
				|| $this->value[$this->name]['error'] === UPLOAD_ERR_FORM_SIZE
				|| $this->value[$this->name]['size'] > $size
			) {
				$this->setError('fileSize', $this->value[$this->name]['size']);
			}
		} else {
			throw new Exception('Method "maxSize" can only be used on file array.');
		}

		return $this;
	}

	public function mimeTypes(...$mimeTypes): self {
		if ($this->isFile && is_array($this->value[$this->name]['name'])) {
			// File Array
			foreach ($this->value[$this->name]['name'] as $key => $fileName) {
				if ($this->value[$this->name]['error'][$key] === UPLOAD_ERR_OK) {
					$fileInfo = new finfo(FILEINFO_MIME);
					$fileMimeType = $fileInfo->file($this->value[$this->name]['tmp_name'][$key], FILEINFO_MIME_TYPE);

					$key = array_search($fileMimeType, $mimeTypes, true);

					if ($key === false) $this->setError('mimeType', $fileName . ' (' . $fileMimeType . ')');
				} else {
					$this->setError('mimeType', $fileName . ' (' . $this->value[$this->name]['error'] . ')');
				}
			}
		} elseif ($this->isFile) {
			// File
			if ($this->value[$this->name]['error'] === UPLOAD_ERR_OK) {
				$fileInfo = new finfo(FILEINFO_MIME);
				$fileMimeType = $fileInfo->file($this->value[$this->name]['tmp_name'], FILEINFO_MIME_TYPE);

				$key = array_search($fileMimeType, $mimeTypes, true);

				if ($key === false) $this->setError('mimeType', $fileMimeType);
			} else {
				$this->setError('mimeType', $this->value[$this->name]['name'] . ' (' . $this->value[$this->name]['error'] . ')');
			}
		} else {
			throw new Exception('Method "mimeTypes" can only be used on file array.');
		}

		return $this;
	}

	private function setError(string $code, string $context = null) {
		$error = [
			'name'    => $this->name,
			// 'message' => $message
			'code'    => $code,
			'context' => $context,
		];

		$this->errors[$this->name][] = $error;
	}

	public function getErrors() {
		return $this->errors;
	}

	public function reset() {
		$this->errors = [];
	}

	public function isValid() {
		if (count($this->errors) > 0) return false;

		return true;
	}

}

class Migration {

	protected PDO $db;
	private string $table = 'migrations';

	public function __construct(PDO $db, ?string $table = null) {
		$this->db = $db;
		if (isset($table)) $this->table = $table;

		$this->checkMigrationTable();
	}

	public function __destruct() {
		unset($this->db);
	}

	public function run(array $migrations, bool $rerun = false) {
		$currentVersion = $rerun ? 0 : $this->findCurrentVersion();

		if (!$currentVersion) $currentVersion = 0;
		$nextVersion = 0;

		foreach ($migrations as $version => $migration) {
			$nextVersion = $version + 1;
			if ($nextVersion <= $currentVersion) continue;

			try {
				$migration($this->db);
			} catch (Exception $e) {
				die($e);
			}
		}

		if ($currentVersion == $nextVersion) {
			return false;
		}

		$this->saveNewVersion($nextVersion);

		return true;
	}

	private function checkMigrationTable() {
		$queryTableCheck = "SELECT 1 FROM `$this->table`";
		$queryTableCreate = "CREATE TABLE `$this->table` (
			`id`        INTEGER NOT NULL PRIMARY KEY AUTO_INCREMENT,
			`version`   INTEGER NOT NULL,
			`timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
		)";

		try {
			$this->db->query($queryTableCheck);
		} catch (Exception $e) {
			// Table not found, create it.
			$this->db->exec($queryTableCreate);
		}
	}

	private function findCurrentVersion() {
		$queryLastId = "SELECT * FROM `$this->table` ORDER BY `id` DESC LIMIT 1";

		$statement = $this->db->prepare($queryLastId);
		$statement->execute();

		$row = $statement->fetch();

		if (empty($row)) return;

		return $row['version'];
	}

	private function saveNewVersion(int $version) {
		$query = "INSERT INTO `$this->table` (`version`) VALUES (:newVersion)";

		$statement = $this->db->prepare($query);
		$statement->execute([
			'newVersion' => $version,
		]);
	}

}

abstract class ActiveRecord implements JsonSerializable {

	protected static PDO $db;
	protected static string $defaultDateTimeFormat = 'Y-m-d H:i:s';

	protected Validator $validator;
	protected array $data = [];

	protected string $table;
	protected array $fields = [];
	protected array $additional = [];
	protected array $hidden = ['password'];
	protected string $primaryKey = 'id';

	private ?array $constraintsContext;

	public function __construct() {
		if (!$this->table) {
			throw new Exception('No database table set.');
		}

		if (empty($this->fields)) {
			throw new Exception('No fields for table set.');
		}

		return $this;
	}

	public function __set(string $name, mixed $value) {
		$key = $this->convertKey($name);
		$this->data[$key] = $value;
	}

	public function __get(string $name): mixed {
		if (array_key_exists($name, $this->data)) {
			return $this->data[$name];
		}

		return null;
	}

	public function __isset(string $name): bool {
		return isset($this->data[$name]);
	}

	public static function setDatabase(PDO $db) {
		self::$db = $db;
	}

	public static function getDatabase(): PDO {
		return self::$db;
	}

	public function setTable(string $table) {
		if (!preg_match('/^[A-Za-z0-9._-]*$/', $table)) throw new Exception('Error setting database table.');

		$this->table = $table;
	}

	public function getTable(): string {
		return (getenv('DB_TABLE_PREFIX') ?: '') . $this->table;
	}

	private function getFields() {
		return $this->fields;
	}

	public function getPrimaryKey(): string {
		return $this->primaryKey;
	}

	public function getData(): array {
		return $this->data;
	}

	public function iterateData(Closure $c) {
		foreach ($this->data as $key => &$value) {
			$c($key, $value);
		}
	}

	public static function setDefaultDatimeFormat(string $format) {
		self::$defaultDateTimeFormat = $format;
	}

	public static function getDefaultDatimeFormat(): PDO {
		return self::$defaultDateTimeFormat;
	}

	public static function getCurrentDateTime(): string {
		return gmdate(self::$defaultDateTimeFormat);
	}

	public function convertKey(string $key) {
		$key = str_replace(' ', '', ucwords(str_replace('_', ' ', $key)));
		$key = str_replace(' ', '', ucwords(str_replace('-', ' ', $key)));

		return lcfirst($key);
	}

	public function save(): bool {
		if (!$this->isValid()) return false;

		if ($this->{$this->primaryKey}) return $this->update();

		return $this->insert();
	}

	protected function insert(): bool {
		$fields = $this->getFields();
		$questionMarks = [];

		foreach ($fields as $field) {
			$questionMarks[] = '?';
			$getter = $this->convertKey($field);

			if (isset($this->data[$getter])) {
				$values[] = $this->data[$getter];
			} else {
				$values[] = null;
			}
		}

		$query = "INSERT INTO `$this->table` (`"
			. implode("`, `", $fields)
			. "`) VALUES ("
			. implode(", ", $questionMarks)
			. ")";

		$statement = $this->getDatabase()->prepare($query);

		foreach ($values as $i => $value) {
			$statement->bindValue(($i + 1), $value, $this->getDataType($value));
		}

		return $statement->execute();
	}

	protected function update(): bool {
		$fields = $this->getFields();
		$primaryKey = $this->primaryKey;

		foreach($fields as $field){
			$getter = $this->convertKey($field);
			
			if (isset($this->data[$getter])) {
				$values[] = $this->data[$getter];
			} else {
				$values[] = null;
			}
		}

		$query = "UPDATE `$this->table`"
			. " SET `" . implode('` = ?, `', $fields) . "` = ?"
			. " WHERE `$primaryKey` = ?";

		$statement = $this->getDatabase()->prepare($query);

		foreach ($values as $i => $value) {
			$statement->bindValue(($i + 1), $value, $this->getDataType($value));
		}

		$statement->bindValue(count($values) + 1, $this->{$primaryKey}, PDO::PARAM_INT);

		return $statement->execute();
	}

	public function delete() {
		$primaryKey = $this->primaryKey;
		$query = "DELETE FROM `$this->table` WHERE `$primaryKey` = :id";
		$id = $this->{$primaryKey};

		$statement = $this->getDatabase()->prepare($query);
		$statement->bindParam(':id', $id, PDO::PARAM_INT);

		return $statement->execute();
	}

	public static function find(int $id, ?string $tableName = null) {
		$entity = new static();
		if ($tableName) $entity->setTable($tableName);

		$table = $entity->getTable();
		$primaryKey = $entity->getPrimaryKey();

		$query = "SELECT * FROM `$table` WHERE `$primaryKey` = :id";

		$statement = $entity->getDatabase()->prepare($query);
		$statement->bindParam(':id', $id, PDO::PARAM_INT);
		$statement->execute();

		$row = $statement->fetch(PDO::FETCH_ASSOC);

		if (!empty($row)) {
			foreach ($row as $rowKey => $rowValue) {
				$setter = $entity->convertKey($rowKey);
				$entity->{$setter} = $rowValue;
			}
			
			return $entity;
		}
	}

	public static function findWhere(string $fieldName, mixed $fieldValue, ?string $orderBy = null, ?string $sort = 'ASC', ?int $limit = null, ?int $offset = null, ?string $tableName = null): array {
		$entity = new static();
		if ($tableName) $entity->setTable($tableName);

		$table = $entity->getTable();
		$fields = $entity->getFields();

		if (!in_array($fieldName, $fields)) throw new Exception('Exception in `findWhere` because passed field name is not valid.');
		if ($orderBy && !in_array($orderBy, $fields)) throw new Exception('Exception in `findWhere` because passed field name for ordering is not valid.');
		if ($sort && !in_array(strtolower($sort), ['asc', 'desc'])) throw new Exception('Exception in `findWhere` because passed value for sorting is not valid.');

		$query = "SELECT * FROM `$table` WHERE `$fieldName` = :fieldValue";
		
		if ($orderBy)          $query .= " ORDER BY `$orderBy`";
		if ($sort && $orderBy) $query .= " $sort";
		if ($limit)            $query .= " LIMIT $limit";
		if ($offset && $limit) $query .= " OFFSET $offset";

		$statement = $entity->getDatabase()->prepare($query);
		$statement->bindParam(':fieldValue', $fieldValue, $entity->getDataType($fieldValue));
		$statement->execute();

		$entities = [];

		foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
			$entityFromRow = new static();
			if ($tableName) $entityFromRow->setTable($tableName);

			foreach ($row as $rowKey => $rowValue) {
				$setter = $entityFromRow->convertKey($rowKey);
				$entityFromRow->{$setter} = $rowValue;
			}

			$entities[] = $entityFromRow;
		}

		return $entities;
	}

	public static function findOne(string $fieldName, mixed $fieldValue, ?string $tableName = null) {
		$entity = new static();

		if ($tableName) {
			$entity->setTable($tableName);
			$entities = static::findWhere($fieldName, $fieldValue, null, 'ASC', null, null, $tableName);
		} else {
			$entities = static::findWhere($fieldName, $fieldValue);
		}

		if (count($entities)) {
			return $entities[0];
		}
	}

	public static function findAll(?string $orderBy = null, ?string $sort = 'ASC', ?int $limit = null, ?int $offset = null, ?string $tableName = null): array {
		$entity = new static();
		if ($tableName) $entity->setTable($tableName);

		$table = $entity->getTable();

		if ($orderBy && !in_array($orderBy, $fields)) throw new Exception('Exception in `findWhere` because passed field name for ordering is not valid.');
		if ($sort && !in_array(strtolower($sort), ['asc', 'desc'])) throw new Exception('Exception in `findWhere` because passed value for sorting is not valid.');

		$query = "SELECT * FROM `$table`";

		if ($orderBy)          $query .= " ORDER BY `$orderBy`";
		if ($sort && $orderBy) $query .= " $sort";
		if ($limit)            $query .= " LIMIT $limit";
		if ($offset && $limit) $query .= " OFFSET $offset";

		$statement = $entity->getDatabase()->prepare($query);
		$statement->execute();

		$entities = [];

		foreach ($statement->fetchAll(PDO::FETCH_ASSOC) as $row) {
			$entityFromRow = new static();
			if ($tableName) $entityFromRow->setTable($tableName);

			foreach ($row as $rowKey => $rowValue) {
				$setter = $entityFromRow->convertKey($rowKey);
				$entityFromRow->{$setter} = $rowValue;
			}

			$entities[] = $entityFromRow;
		}

		return $entities;
	}

	public function lastInsertId() {
		return $this->getDatabase()->lastInsertId();
	}

	public function useConstraints(Validator $validator, ?array $context = null) {
		$this->validator = $validator;
		$this->constraintsContext = $context;
	}

	protected function constraints(Validator $validator, ?array $context = null) {
		return;
	}

	public function isValid(): bool {
		if (!isset($this->validator)) return true;

		$this->validator->reset();

		$this->constraints($this->validator, $this->constraintsContext);

		return $this->validator->isValid();
	}

	public function getErrors(): array {
		if (!isset($this->validator)) return [];
		return $this->validator->getErrors();
	}

	public function getError(string $fieldName): ?array {
		$errors = $this->getErrors();

		if (isset($errors) && isset($errors[$fieldName])) return $errors[$fieldName];

		return null;
	}

	public function __serialize(): array {
		return $this->generateSerializableData();
	}

	public function jsonSerialize(): array {
		return $this->generateSerializableData();
	}

	private function generateSerializableData(): array {
		$data = [];

		foreach ($this->getFields() as $field) {
			if (in_array($field, $this->hidden)) continue;

			$getter = $this->convertKey($field);
			$data[$getter] = $this->data[$getter] ?? null;
		}

		if ($this->additional) {
			foreach ($this->additional as $additional) {
				if (in_array($additional, $this->hidden)) continue;

				$getter = $this->convertKey($additional);
				$data[$getter] = $this->data[$getter] ?? null;
			}
		}

        return $data;
	}

	private function getDataType($value) {
		$type = gettype($value);

		switch ($type) {
			case 'boolean':
				return PDO::PARAM_BOOL;
			case 'integer':
				return PDO::PARAM_INT;
			case 'double':
			case 'string':
				return PDO::PARAM_STR;
			case 'NULL':
				return PDO::PARAM_NULL;
		}

		throw new Exception('ActiveRecord can not work with type [' . $type . '] of value [' . $value . '], please write own statement.'); 
	}

}

class DatabaseFromEnv {

	use EnvTrait;

	protected PDO $db;

	public function __construct() {
		$this->loadEnv('.env');
		$this->createDatabaseFromEnv();
	}

	public function getDatabase(): PDO {
		return $this->db;
	}

	private function createDatabaseFromEnv() {
		if (!empty(getenv('DB_DSN'))) {
			$dsn = getenv('DB_DSN');
			$type = explode(':', $dsn)[0];
			$charset = isset(explode('charset=', $dsn)[1]) ? explode('charset=', $dsn)[1] : 'utf8';

			try {
				if ($type == 'mysql') {
					$this->db = new PDO($dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'));
					$this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
					$this->db->setAttribute(PDO::MYSQL_ATTR_INIT_COMMAND, 'SET NAMES ' . $charset);
					$this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
				} elseif ($type == 'sqlite') {
					$this->db = new PDO($dsn);
					$this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
					$this->db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
				}
			} catch (PDOException $e) {
				throw new PDOException($e->getMessage());
			}
		} else {
			throw new Exception('Unable to create database from environment variables, maybe some variables are missing.');
		}
	}

}

interface ComponentInterface {

	public function __invoke(): string;

}

class View {

	use SanitizerTrait;

	private array $layout = ['file' => null, 'data' => null];
	private array $areas;
	private string $content;
	private array $classList = [];
	protected I18n $i18n;

	public function withLayout(string $file, array|ActiveRecord|null $arrayOrRecord = null, bool $sanitize = true): self {
		if ($arrayOrRecord && $sanitize) {
			$data = $this->sanitize($arrayOrRecord);
		} else {
			$data = $arrayOrRecord;
		}

		$this->layout['file'] = $file;
		$this->layout['data'] = $data;

		return $this;
	}

	public function withLayoutData(array $data = [], ?bool $sanitize = true) {
		if ($sanitize) $data = $this->sanitize($data);

		$this->layout['data'] = array_merge($this->layout['data'] ?? [], $data);

		return $this;
	}

	public function withArea(string $file, ?string $areaName = 'main', array|ActiveRecord|null $arrayOrRecord = null, ?bool $sanitize = true): self {
		if ($arrayOrRecord && $sanitize) {
			$data = $this->sanitize($arrayOrRecord);
		} else {
			$data = $arrayOrRecord;
		}

		$this->areas[$areaName]['file'] = $file;
		$this->areas[$areaName]['data'] = $data;

		return $this;
	}

	public function withAreaData(array $data = [], string $areaName = 'main', ?bool $sanitize = true) {
		if ($sanitize) $data = $this->sanitize($data);

		$this->areas[$areaName]['data'] = array_merge($this->areas[$areaName]['data'] ?? [], $data);

		return $this;
	}

	public function withContent(string $content): static {
		$this->content = $content;
		return $this;
	}

	public function withI18n(I18n $i18n): self {
		$this->i18n = $i18n;

		return $this;
	}

	public function withClassList(string $context, ?array $classes = null): self {
		$this->classList[$context] = $classes;
		return $this;
	}

	public function getI18n(): ?I18n {
		return $this->i18n ?? null;
	}

	protected function classList(string $context, ?array $classes = null) {
		if (!isset($this->classList[$context])) $this->classList[$context] = [];
		if (!$classes) $classes = [];
		if (!$this->classList[$context] && !$classes) return;

		$classList = [];
		$classListWithConditions = array_merge($classes, $this->classList[$context]);

		foreach ($classListWithConditions as $className => $classCondition) {
			if ($classCondition) $classList[] = $className;
		}

		if (count($classList) === 0) return '';

		return 'class="' . implode(' ', $classList) . '"';
	}

	protected function hasArea(string $areaName) {
		return isset($this->areas[$areaName]);
	}

	private function area(?string $areaName = 'main') {
		if (!isset($this->areas[$areaName])) return;

		$template = $this->areas[$areaName]['file'];

		if (file_exists($template)) {
			$data = $this->areas[$areaName]['data'];
			if (is_array($data) && count($data) > 0) extract($data);

			include $template;
		} else {
			throw new TemplateRenderException('Template file "' . $template . '" not found.');
		}
	}

	private static function getMethodField(string $method = 'POST') {
		return '<input type="hidden" name="_method" value="' . $method . '" />';
	}

	private static function getCsrfField() {
		Session::start();
		$token = Session::getToken() ?? Session::generateToken();

		return '<input type="hidden" name="_token" value="' . $token . '" />';
	}

	private static function getHoneypotField() {
		return '<input type="checkbox" name="hooman-check" id="hooman-check" aria-hidden="true" tabindex="-1" style="position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0.1">';
	}

	private function e($value, $alt = null) {
		if (!$value && $alt) {
			$data = $this->sanitize($alt);
		} else {
			$data = $this->sanitize($value);
		}

		if (is_array($data)) {
			echo implode(', ', $$data);
			return;
		}

		echo $data;
	}

	private function i18n(string $key, ?string $fallback = null, ...$args) {
		if (!isset($this->i18n)) {
			echo $fallback;
			return;
		}

		echo $this->i18n->get($key, $fallback, ...$args);
	}

	private function getI18nString(string $key, ?string $fallback = null, ...$args) {
		if (!isset($this->i18n)) return $fallback;

		return $this->i18n->get($key, $fallback, ...$args);
	}

	private function component(string $className, ...$params): ?string {
		$component = new $className(...$params);

		if (is_callable($component)) {
			return $component();
		}

		if (($component instanceof View)) {
			if ($this->getI18n()?->getLocale()) $component->getI18n()?->setLocale($this->getI18n()?->getLocale());

			return $component->render();
		}

		return null;
	}

	// @todo Allow match with pattern
	protected function isActive(string $url): bool {
		$uriParts = parse_url($_SERVER['REQUEST_URI']);
		return $url == ($uriParts['path'] ?? '/');
	}

	private function hasFlash($key) {
		return Session::hasFlash($key);
	}

	private function getFlash($key) {
		return Session::getFlash($key);
	}

	public function getAreas(): array {
		return $this->areas;
	}

	public function getArea(string $areaName = 'main') {
		return $this->areas[$areaName] ?? null;
	}

	public function renderAreas(): string {
		ob_start();

		if (isset($this->areas)) {
			foreach ($this->areas as $areaName => $area) {
				$this->area($areaName);
			}
		}

		$this->content = ob_get_contents();
		ob_end_clean();

		return $this->content;
	}

	public function render(): string {
		if (isset($this->content)) {
			return $this->content;
		}

		if (!$this->layout['file'] || !file_exists($this->layout['file'])) {
			return $this->renderAreas();
		}

		ob_start();

		if (is_array($this->layout['data']) && count($this->layout['data']) > 0) extract($this->layout['data']);

		include $this->layout['file'];

		$this->content = ob_get_contents();
		ob_end_clean();

		return $this->content;
	}

	public function __toString(): string {
		return $this->render();
	}

}

class Result {

	use HeaderTrait;

	public const SUCCESS = 'success';
	public const ERROR   = 'error';
	public const INVALID = 'invalid';

	private array|object|string|null $body;
	private int $status;

	public function __construct(array|object|string|null $body, int $status = 200, array $headers = []) {
		$this->body = $body;
		$this->status = $status;
		$this->headers = array_merge($this->headers, $headers);
	}

	public function setBody(array|object|string|null $body) {
		$this->body = $body;
	}

	public function appendToBody(string $bodyPart) {
		if (is_string($this->body)) $this->body .= $bodyPart;
	}

	public function getBody(): array|object|string|null {
		return $this->body;
	}

	public function setStatus(int $status) {
		$this->status = $status;
	}

	public function getStatus(): int {
		return $this->status;
	}

	public static function generateArray(string $type = RESULT::SUCCESS, ?string $message = null, ?array $result = []) {
		if (!$message && $type == Result::SUCCESS) $message = 'OK';

		return [
			'type'  => $type,
			'message' => $message,
			'result' => $result,
		];
	}

}

class ResultVariations {

	private array $variations = [];

	public function add(string $contentType, Result $result) {
		$this->variations[$contentType] = $result;

		return $this;
	}

	public function has(string $contentType): bool {
		return isset($this->variations[$contentType]);
	}

	public function get(?string $contentType = null): array|Result {
		if ($contentType && $this->variations[$contentType]) {
			return $this->variations[$contentType];
		}

		return $this->variations;
	}

}

class Route {

	use InterceptorTrait;

	public const GET = 'GET';
	public const POST = 'POST';
	public const PUT = 'PUT';
	public const PATCH = 'PATCH';
	public const HEAD = 'HEAD';
	public const OPTIONS = 'OPTIONS';
	public const DELETE = 'DELETE';

	private string $method;
	private string $uri;
	private $action;
	private array $parameters = [];
	private string $locale;
	private bool $onlyRouteInterceptor = false;
	private array $excludedAppInterceptors = [];
	private ?string $name = null;

	public function __construct(string $method, string $uri, callable|array $action) {
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

	public function usesOnlyRouteInterceptor(): bool {
		return $this->onlyRouteInterceptor;
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

	public function getMethod(): string {
		return $this->method;
	}

	public function getUri(): string {
		return $this->uri;
	}

	public function getAction() {
		return $this->action;
	}

	public function setParameters(array $parameters) {
		$this->parameters = $parameters;
	}

	public function getParameters(): array {
		return $this->parameters;
	}

	public function setLocale(string $locale) {
		$this->locale = $locale;
	}

	public function getLocale(): ?string {
		return $this->locale ?? null;
	}

	public function getName(): ?string {
		return $this->name;
	}

}

class Router {

	protected string $contextPath;
	private array $locales = [];

	private array $routes = [];
	private ?Route $route = null;

	public function __call(string $name, array $arguments): Route {
		$method = strtoupper($name);
		$uri = $arguments[0];
		$callableOrArray = $arguments[1];

		if ($this->contextPath) $uri = '/' . trim($this->contextPath, '/\\') . $uri;

		$this->routes[$method][] = new Route($method, $uri, $callableOrArray);
		return end($this->routes[$method]);
	}

	public function findRoute(string $requestedMethod, string $requestedUri): ?Route {
		if (empty($this->routes) || empty($this->routes[$requestedMethod])) return null;

		$uriParts = parse_url($requestedUri);
		$path = ($uriParts['path'] ?? '')
			. (isset($uriParts['query']) ? '?' . $uriParts['query'] : '')
			. (isset($uriParts['fragment']) ? '#' . $uriParts['fragment'] : '');

		$route = null;
		foreach ($this->routes[$requestedMethod] as $possibleRoute) {
			$uriPattern = $possibleRoute->getUri();

			// Remove leading and trailing slashes (if present) ...
			$path = trim($path, '/\\');
			$uriPattern = trim($uriPattern,   '/\\');

			// ... and add it again, to make sure they are available..
			$path = '/' . $path . '/';
			$uriPattern = '/' . $uriPattern   . '/';

			$uriPattern = preg_quote($uriPattern);

			if (!empty($this->locales)) {
				// Replace locale patterns with regex.
				$uriPattern = str_replace('\{locale\}',   '(' . implode('|', $this->locales) . ')',  $uriPattern, $localeReplaced);
				$uriPattern = str_replace('\{locale\?\}', '?(' . implode('|', $this->locales) . ')?', $uriPattern, $localeOptionalReplaced);
			}

			// Replace patterns with regex.
			$uriPattern = str_replace('\{any\}',   '([A-Za-z0-9_-]+)',   $uriPattern);
			$uriPattern = str_replace('\{any\?\}', '?([A-Za-z0-9_-]+)?', $uriPattern);
			$uriPattern = str_replace('\{num\}',   '(\d+)',   $uriPattern);
			$uriPattern = str_replace('\{num\?\}', '?(\d+)?', $uriPattern);

			$routeMatch = preg_match('(^' . $uriPattern . '$)i', $path, $parameters);

			if (isset($routeMatch) && $routeMatch) {
				$route = $possibleRoute;

				// Remove first element of parameters, because it is the requested route.
				array_shift($parameters);

				$routeParameters = [];

				foreach ($parameters as $key => $parameter) {
					// Remove empty parameter
					if (empty($parameter)) continue;

					// Check if first parameter is one of the defined locales
					if ($key === 0 && in_array($parameter, $this->locales)) {
						$locale = ltrim($parameter, '/');
						if ($locale && !$route->getLocale()) $route->setLocale($locale);
						continue;
					}

					$routeParameters[] = $parameter;
				}

				$route->setParameters($routeParameters);

				break;
			}
		}

		return $route;
	}

	public function setRoute(Route $route) {
		$this->route = $route;
	}

	public function getRoute(): ?Route {
		return $this->route;
	}

	public function setLocales(string ...$locales) {
		$this->locales = $locales;
	}

	public function getLocale(): ?string {
		if (!$this->route) return null;

		return $this->route->getLocale();
	}

	/**
	 * Return route URI by name.
	 *
	 * @param string $name       Route name.
	 * @param array  $parameters (optional) Parameters to apply to rule, just a list of parameters..
	 *
	 * @return string URI for named route.
	 */
	public function generateRouteByName(?string $name = null, array $parameters = []) {
		$pattern = '{\w+\??}';
		$routeUri = !isset($name)
			? $this->getRoute()?->getUri() ?? '/'
			: '/';

		// If a name is handed to the method, search for the route
		if ($name) {
			foreach ($this->routes as $methodRoutes) {
				foreach ($methodRoutes as $methodRoute) {
					if ($methodRoute->getName() == $name) {
						// $route = $methodRoute;
						$routeUri = $methodRoute->getUri();
						break;
					}
				}
			}
		}

		// If the current route has a locale set, use it
		if ($this->getRoute()?->getLocale()) {
			$localeReplacement = '/' . $this->getRoute()->getLocale();
		} else {
			$localeReplacement = '';
		}

		// Replace locale pattern
		$routeUri = str_replace('/{locale}',  $localeReplacement, $routeUri);
		$routeUri = str_replace('/{locale?}', $localeReplacement, $routeUri);

		if (empty($routeUri)) $routeUri = '/';

		// Get the route
		try {
			$uri = preg_replace_callback('(' . $pattern . ')', function ($matches) use (&$parameters) {
				return array_shift($parameters);
			}, $routeUri);

			// Remove duplicated slashes if route has optional parameters
			$uri = preg_replace('#(?<!:)//+#', '/', $uri);

			return $uri;
		} catch (Exception $e) {
			exit($e->getMessage());
		}

		return;
	}

	public function setContextPath(string $contextPath) {
		$this->contextPath = $contextPath;
	}

}

class App extends Router {

	use EnvTrait;
	use InterceptorTrait;
	use HeaderTrait;
	use PredefinedVariablesTrait;
	use ValueTrait;

	protected DIContainer $container;
	protected ?string $errorViewClass = null;

	public function __construct(DIContainer $container) {
		$this->container = $container;

		$this->loadEnv('.env');
		$this->init();
	}

	public function init() {
		if (getEnv('DEBUG') && getEnv('DEBUG') == 'true') error_reporting(E_ALL);

		set_exception_handler([$this, 'exceptionHandler']);

		$this->contextPath = getenv('APP_CONTEXT_PATH');

		$this->initHeadersFromRequest();
		$this->initPredefinedVariables();
	}

	public function setErrorViewClass(string $errorViewClass) {
		$this->errorViewClass = $errorViewClass;
	}

	public function exceptionHandler(Throwable $e) {
		$isDebugMode = getEnv('DEBUG') && getEnv('DEBUG') == 'true';
		$result = new Result('<h1>Internal Server Error</h1>', 500, ['Content-Type', 'text/html; charset=utf-8']);

		if (is_int($e->getCode())) {
			$result->setStatus($e->getCode() > 0 ? $e->getCode() : 500);
		}

		$resultArray = Result::generateArray(
			Result::ERROR,
			$e->getMessage(),
			$isDebugMode ? [
				'code' => $result->getStatus(),
				'exception' => $e,
				'trace' => $e->getTraceAsString(),
			] : [],
		);

		if ($result->getStatus() != 500) {
			$result->setBody('<h1>Error</h1>');

			if ($result->getStatus() == 404) {
				$result->setBody('<h1>Not Found</h1>');
			}

			if ($e instanceof TemplateRenderException) {
				$result->setBody('<p><strong>TemplateRenderException<strong></p>');
			}
		}

		if ($isDebugMode) {
			$result->appendToBody('<p>' . $e->getMessage() . '</p><p>' . $e->getTraceAsString() . '</p>' . $e);
		}

		if ($this->errorViewClass) {
			$errorView = $this->container->resolve($this->errorViewClass);

			if ($errorView instanceof View) {
				if ($this->getLocale()) $errorView->getI18n()?->setLocale($this->getLocale());

				$errorView->withLayoutData([
					'error' => $resultArray,
				]);
			}

			$result->setBody($errorView);
		}

		// JSON
		if (
			$this->getHeader('Accept') == 'application/json'
			|| $this->getHeader('Content-Type') == 'application/json'
		) {
			$result->setBody($resultArray);
		}

		$this->render($result);
	}

	public function getContainer(): DIContainer {
		return $this->container;
	}

	public function run() {
		$route = $this->findRoute($this->method, $this->uri);
		if (!$route) throw new HttpException('Not Found.', 404);
		$this->setRoute($route);

		if (!$route->usesOnlyRouteInterceptor() && $this->getInterceptorBefore()) ($this->getInterceptorBefore())($this);
		if ($route->getInterceptorBefore()) ($route->getInterceptorBefore())($this);

		$callableAction = $route->getAction();
		if (gettype($callableAction) === 'array') {
			$class = $callableAction[0];
			$action = $callableAction[1] ?? 'index';
			$object = $this->container->resolve($class);

			if (!method_exists($object, $action)) throw new HttpException('Not Found.', 404);

			$callableAction = [$object, $action];
		}

		$result = ($callableAction)(...$route->getParameters());

		if ($result instanceof ResultVariations) {
			$accept = $this->getHeader('Accept');

			if ($accept && $result->has($accept)) {
				$result = $result->get($accept);
			} else {
				$variations = $result->get();
				$result = reset($variations);
			}

			if (!$result) throw new HttpException('Not Found.', 404);
		}

		if ($result instanceof View && $this->getLocale()) {
			$result->getI18n()?->setLocale($this->getLocale());
		}
		if (!$result instanceof Result) $result = new Result($result);

		if ($route->getInterceptorAfter()) $result = ($route->getInterceptorAfter())($this, $result);
		if (!$route->usesOnlyRouteInterceptor() && $this->getInterceptorAfter()) $result = ($this->getInterceptorAfter())($this, $result);

		$this->render($result);
	}

	public function render(Result $result) {
		$body = $result->getBody();
		$derivedContentType = 'text/html; charset=utf-8';
		$output = '';

		if (is_null($body)) {
			$output = '';
		} elseif (is_string($body) || (is_object($body) && method_exists($body , '__toString'))) {
			$output = $body;
		} elseif (is_object($body) || is_array($body)) {
			$derivedContentType = 'application/json';
			$output = json_encode($body);
		} else {
			throw new HttpException('Action returns wrong type.', 500);
		}

		if (!$result->getHeader('Content-Type')) $result->setHeader('Content-Type', $derivedContentType);

		http_response_code($result->getStatus());

		foreach ($result->getHeaders() as $name => $value) {
			header($name . ': ' . $value);
		}

		echo $output;
	}

}

class AppBeforeInterceptor {

	protected string $csrfTokenHeader = 'X-CSRF-TOKEN';
	protected string $csrfTokenName = '_token';

	protected array $xssFilterExceptions = [
		'password',
		'password-confirmation',
		'password-new',
	];
	protected string $xssFilterAllowedTags = ''; // E. g. '<strong>,<em>'

	private App $app;

	public function __invoke(App $app) {
		$this->app = $app;

		if (!$this->app->getRoute()->isAppInterceptorExcluded('allowed-domains')) {
			$this->checkAllowedDomains();
		}

		if (!$this->app->getRoute()->isAppInterceptorExcluded('csrf')) {
			$this->checkCsrfToken();
		}

		if (!$this->app->getRoute()->isAppInterceptorExcluded('xss-filter')) {
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

			$key = array_search($this->app->getHost(), $allowedHosts);

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
			$this->app->getMethod() != Route::POST
			&& $this->app->getMethod() != Route::PUT
			&& $this->app->getMethod() != Route::PATCH
			&& $this->app->getMethod() != Route::DELETE
		) return;

		Session::start();

		$token = $this->app->getHeader($this->csrfTokenHeader)
			? $this->app->getHeader($this->csrfTokenHeader)
			: $this->app->getParsedBody()[$this->csrfTokenName] ?? null;

		if (!$token || !Session::hasValidToken($token)) {
			throw new HttpException('CSRF Violation', 400);
		}
	}

	private function filterBodyValues() {
		$contentType = explode(';', $this->app->getHeader('Content-Type'))[0];

		if ($contentType == 'application/x-www-form-urlencoded' || $contentType == 'multipart/form-data') {
			$post = $this->app->getParsedBody();

			foreach ($post as $key => $value) {
				if (!in_array($key, $this->xssFilterExceptions, true)) {
					$post[$key] = trim(strip_tags($value, $this->xssFilterAllowedTags));
				}
			}

			$_POST = $post;
			$this->app->setParsedBody($post);
		}
	}

}

class AppAfterInterceptor {

	private App $app;
	private Result $result;

	public function __invoke(App $app, Result $result): Result {
		$this->app = $app;
		$this->result = $result;

		if (!$this->app->getRoute()->isAppInterceptorExcluded('charset')) {
			$this->applyCharset();
		}

		if (!$this->app->getRoute()->isAppInterceptorExcluded('cors')) {
			$this->applyCorsHeaders();
		}

		if (!$this->app->getRoute()->isAppInterceptorExcluded('security-headers')) {
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

		$this->result->setHeader('Access-Control-Allow-Headers', 'Content-Type');
		$this->result->setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, HEAD, OPTIONS');
	}

	private function applySecurityHeaders() {
		if (getenv('APP_CSP')) {
			$this->result->setHeader('Content-Security-Policy', getenv('APP_CSP'));
		}

		$this->result->setHeader('Permissions-Policy', 'interest-cohort=()');
		$this->result->setHeader('Referrer-Policy', 'same-origin');
		$this->result->setHeader('Strict-Transport-Security', 'max-age=7884000; includeSubDomains');
		$this->result->setHeader('X-Content-Type-Options', 'nosniff');
		$this->result->setHeader('X-Frame-Options', 'sameorigin');
		$this->result->setHeader('X-XSS-Protection', '1; mode=block');
	}

}

class DIContainer {

	use DITrait;

}

return (function () {
	if (php_sapi_name() === 'cli') return;

	$container = new DIContainer();
	$container->set('App\DIContainer', $container);

	$app = new App($container);
	$app->before(new AppBeforeInterceptor());
	$app->after(new AppAfterInterceptor());

	$app->getContainer()->set('App\App', $app);

	return $app;

	// For use of "index.php" in subfolder, e. g. "./public" but keeping files
	// like ".env" in root "./"
	// chdir(dirname(__DIR__));
	// before `$app = require 'app.php';`
})();
