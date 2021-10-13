<?php

namespace App;

use \finfo;
use \PDO;
use \PDOException;
use \ArrayObject;
use \JsonSerializable;
use \Exception;
use \Throwable;

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

	private array $headers = ['Content-Type' => 'text/html'];

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

trait DatabaseFromEnvTrait {

	protected PDO $db;

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
				} elseif ($type == 'sqlite') {
					$this->db = new PDO($dsn);
					$this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
				}
			} catch (PDOException $e) {
				throw new PDOException($e);
			}
		}
	}

}

trait SanitizerTrait {

	public function sanitize(array|string|null $input) {
		if (is_array($input) && count($input) == 0) return;
		if (is_null($input)) return;

		$isAssoc = function (array $arr): bool {
			return array_keys($arr) !== range(0, count($arr) - 1);
		};

		if (is_array($input) && $isAssoc($input)) {
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

class I18n {

	private array $lines = [];
	private string $locale = 'en';

	public function __construct(string $file, ?string $locale = 'en') {
		$this->lines[$locale] = include $file;
		$this->locale = $locale;
	}

	public function load(string $file, ?string $locale = 'en') {
		$this->lines[$locale] = include $file;
	}

	public function setLocale(string $locale) {
		$this->locale = $locale;
	}

	public function getLocale(): string {
		return $this->locale;
	}

	public function get(string $line, ?string $fallback, ...$args): string {
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

	public static function setRateLimitCookie(int $status, string $name, int $expirationSeconds = 60) {
		if ($status == 200) setcookie($name, true, time() + $expirationSeconds);
	}

	public static function checkRateLimitCookie(App $app, string $name) {
		if (isset($app->cookieParams[$name])) {
			throw new HttpException('Too much requests, please try again later.', 429);
		}
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

	public function minMax(?int $min, ?int $max = null): self {
		$notInRange = false;
		$value = $this->value;

		// File Array
		if ($this->isFile && is_array($this->value[$this->name]['name'])) {
			$value = count($this->value[$this->name]['name']);
		}

		if (is_numeric($value)) {
			if (isset($min) && $value < $min) $notInRange = true;
			if (isset($max) && $value > $max) $notInRange = true;
		} elseif (is_string($value) && !empty($value)) {
			if (isset($min) && strlen($value) < $min) $notInRange = true;
			if (isset($max) && strlen($value) > $max) $notInRange = true;
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

	public function clean(): self {
		$this->value = filter_var($this->value, FILTER_SANITIZE_STRING);

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

	public function isValid() {
		if (count($this->errors) > 0) return false;

		return true;
	}

}

class Migration {

	use DatabaseFromEnvTrait;

	private string $file = './.migrations';

	public function __construct(?string $file) {
		$this->createDatabaseFromEnv();

		if (isset($file)) $this->file = $file;
	}

	public function run(callable ...$migrations) {
		if (!file_exists($this->file)) fopen($this->file, 'w');
		$handle = fopen($this->file, 'r');
		$currentVersion = fgets($handle);
		fclose($handle);

		if (!$currentVersion) $currentVersion = 0;

		$lastVersion = 0;

		// echo 'Starting migration, current version: ' . $currentVersion . "\n";

		foreach ($migrations as $version => $migration) {
			$lastVersion = $version + 1;
			if ($lastVersion <= $currentVersion) continue;

			try {
				$migration($this->db);
			} catch (Exception $e) {
				die($e);
			}
		}

		// if ($currentVersion == $lastVersion) {
		// 	echo 'Migration done. Up to date, no changes made.';
		// } else {
		// 	echo 'Migration done. New version: ' . $lastVersion;
		// }

		$handle = fopen($this->file, 'w+');
		fwrite($handle, $lastVersion);
		fclose($handle);

		if ($currentVersion == $lastVersion) {
			return false;
		}

		return true;
	}

}

abstract class ActiveRecord implements JsonSerializable {

	use DatabaseFromEnvTrait;

	protected Validator $validator;
	protected array $data = [];
	protected string $table;
	protected array $fields = [];
	protected string $primaryKey = 'id';
	private ?array $constraintsContext;

	public function __construct() {
		if (!$this->table) {
			throw new Exception('No database table set.');
		}

		if (empty($this->fields)) {
			throw new Exception('No fields for table set.');
		}

		$this->createDatabaseFromEnv();

		return $this;
	}

	public function __set(string $name, mixed $value) {
		$this->data[$name] = $value;
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

	public function save(): bool {
		if (!$this->isValid()) return false;

		if ($this->{$this->primaryKey}) return $this->update();

		return $this->insert();
	}

	private function insert(): bool {
		$fields = $this->getFields();

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

		$statement = $this->db->prepare($query);

		foreach ($values as $i => $value) {
			$statement->bindValue(($i + 1), $value, $this->getDataType($value));
		}

		try {
			return $statement->execute();
		} catch (PDOException $e) {
			die($e->getMessage());
		}
	}

	private function update(): bool {
		$fields = $this->getFields();

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
			. " WHERE `$this->primaryKey` = ?";

		$statement = $this->db->prepare($query);

		foreach ($values as $i => $value) {
			$statement->bindValue(($i + 1), $value, $this->getDataType($value));
		}

		$statement->bindValue(count($values) + 1 , $this->{$this->primaryKey}, PDO::PARAM_INT);

		try {
			return $statement->execute();
		} catch (PDOException $e) {
			die($e->getMessage());
		}
	}

	public function delete() {
		$query = "DELETE FROM `$this->table` WHERE `$this->primaryKey` = :id";

		$statement = $this->db->prepare($query);
		$statement->bindParam(':id', $this->{$this->primaryKey}, PDO::PARAM_INT);

		try {
			return $statement->execute();
		} catch (PDOException $e) {
			die($e->getMessage());
		}
	}

	public static function find(int $id, ?string $tableName = null) {
		$entity = new static();
		if ($tableName) $entity->setTable($tableName);

		$table = $entity->getTable();
		$primaryKey = $entity->getPrimaryKey();

		$query = "SELECT * FROM `$table` WHERE `$primaryKey` = :id";

		$statement = $entity->getDatabase()->prepare($query);
		$statement->bindParam(':id', $id, PDO::PARAM_INT);
		
		try {
			$statement->execute();
		} catch (PDOException $e) {
			die($e->getMessage());
		}

		$row = $statement->fetch();
		
		if (!empty($row)) {
			$entity->map($row);
			
			return $entity;
		}
	}

	public static function findWhere(string $fieldName, mixed $fieldValue, ?string $orderBy = null, ?string $sort = 'ASC', ?int $limit = null, ?int $offset = null, ?string $tableName = null): ArrayObject {
		$entity = new static();
		if ($tableName) $entity->setTable($tableName);

		$table = $entity->getTable();
		$fields = $entity->getFields();

		if (!in_array($fieldName, $fields)) throw new Exception('Exception in `findWhere` because passed field name is not valid.');

		$query = "SELECT * FROM `$table` WHERE `$fieldName` = :fieldValue";
		
		if ($orderBy)          $query .= " ORDER BY `$orderBy`";
		if ($sort && $orderBy) $query .= " $sort";
		if ($limit)            $query .= " LIMIT $limit";
		if ($offset && $limit) $query .= " OFFSET $offset";

		$statement = $entity->getDatabase()->prepare($query);
		$statement->bindParam(':fieldValue', $fieldValue, $entity->getDataType($fieldValue));
		
		try {
			$statement->execute();
		} catch (PDOException $e) {
			die($e->getMessage());
		}

		$entities = new ArrayObject();

		foreach ($statement->fetchAll() as $row) {
			$entity = new static();
			if ($tableName) $entity->setTable($tableName);
			$entity->map($row);

			$entities[] = $entity;
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
			$entity->map($entities[0]->getData());

			return $entity;
		}
	}

	public static function findAll(?string $orderBy = null, ?string $sort = 'ASC', ?int $limit = null, ?int $offset = null) {
		$entity = new static();
		if ($tableName) $entity->setTable($tableName);

		$table = $entity->getTable();

		$query = "SELECT * FROM `$table`";

		if ($orderBy)          $query .= " ORDER BY `$orderBy`";
		if ($sort && $orderBy) $query .= " $sort";
		if ($limit)            $query .= " LIMIT $limit";
		if ($offset && $limit) $query .= " OFFSET $offset";

		$statement = $entity->getDatabase()->prepare($query);

		try {
			$statement->execute();
		} catch (PDOException $e) {
			die($e->getMessage());
		}

		$entities = new ArrayObject();;

		foreach ($statement->fetchAll() as $row) {
			$entity = new static();
			$entity->map($row);

			$entities[] = $entity;
		}

		return $entities;
	}

	public static function query(string $query) {
		$entity = new static();

		$statement = $entity->getDatabase()->prepare($query);

		try {
			$statement->execute();
		} catch (PDOException $e) {
			die($e->getMessage());
		}

		$entities = new ArrayObject();;

		foreach ($statement->fetchAll() as $row) {
			$entity = new static();
			$entity->map($row);

			$entities[] = $entity;
		}

		return $entities;
	}

	public function lastInsertId() {
		return $this->db->lastInsertId();
	}

	public function setDatabase(PDO $db) {
		$this->db = $db;
	}

	public function getDatabase(): PDO {
		return $this->db;
	}

	public function setTable(string $table) {
		$this->table = $table;
	}

	public function getTable(): string {
		return (getenv('DB_TABLE_PREFIX') ?: '') . $this->table;
	}

	public function getPrimaryKey(): string {
		return $this->primaryKey;
	}

	public function getData(): array {
		return $this->data;
	}

	public function map(array $data) {
		foreach ($data as $rowKey => $rowValue) {
			if (is_numeric($rowKey)) continue;

			$key = $this->convertKey($rowKey);
			$setter = $key;
			$this->data[$setter] = isset($data[$rowKey]) ? $data[$rowKey] : null;

			if (is_numeric($this->data[$setter])) {
				if (strpos($this->data[$setter], '.') !== false) {
					$this->data[$setter] = (float) $this->data[$setter];
				} else {
					$this->data[$setter] = (int) $this->data[$setter];
				}
			}
		}
	}

	public function mapFormFields(array $data) {
		foreach ($data as $rowKey => $rowValue) {
			if (is_numeric($rowKey)) continue;
			if (substr($rowKey, 0, 1) === '_') continue;

			$rowKeyMapped = $this->getDatabaseFieldName($rowKey);
			$key = $this->convertKey($rowKeyMapped);

			$setter = $key;
			$this->data[$setter] = $data[$rowKey];

			if (is_numeric($this->data[$setter])) {
				if (strpos($this->data[$setter], '.') !== false) {
					$this->data[$setter] = (float) $this->data[$setter];
				} else {
					$this->data[$setter] = (int) $this->data[$setter];
				}
			}
		}
	}

	public function useConstraints(Validator $validator, ?array $context = null) {
		$this->validator = $validator;
		$this->constraintsContext = $context;
	}

	protected function constraints(Validator $validator, ?array $context = null) {
		return;
	}

	public function getDatabaseFieldName(string $fieldName): string {
		foreach ($this->fields as $databaseFieldName => $formFieldName) {
			if ($formFieldName != $fieldName) continue;
			if (is_numeric($databaseFieldName)) return $formFieldName;

			return $databaseFieldName;
		}

		throw new Exception('ActiveRecord has no mapping for a form field with name "' . $fieldName . '".');
	} 

	public function getFormFieldName(string $fieldName): string {
		if (!isset($this->fields[$fieldName])) {
			$fields = $this->getFields();

			foreach ($fields as $field) {
				if ($field == $fieldName) return $field;
			}

			throw new Exception('ActiveRecord has no mapping for a database field with name "' . $fieldName . '".');
		}

		return $this->fields[$fieldName];
	}

	public function isValid(): bool {
		if (!isset($this->validator)) return true;

		$this->constraints($this->validator, $this->constraintsContext);

		return $this->validator->isValid();
	}

	public function getErrors(): array {
		if (!$this->validator) return [];
		return $this->validator->getErrors();
	}

	public function getError(string $fieldName): ?array {
		$errors = $this->getErrors();

		if (isset($errors) && isset($errors[$fieldName])) return $errors[$fieldName];

		return null;
	}

	public function jsonSerialize(): array {
		return $this->data;
	}

	private function getFields() {
		$fields = [];

		foreach ($this->fields as $databaseFieldName => $formFieldName) {
			if (is_numeric($databaseFieldName)) {
				// There is no mapping so the name is the same.
				$fields[] = $formFieldName;
			} else {
				$fields[] = $databaseFieldName;
			}
		}

		return $fields;
	}

	private function convertKey(string $key) {
		$key = str_replace(' ', '', ucwords(str_replace('_', ' ', $key)));
		$key = str_replace(' ', '', ucwords(str_replace('-', ' ', $key)));

		return lcfirst($key);
	}

	private function getDataType($value) {
		$type = gettype($value);

		switch ($type) {
			case 'boolean':
				return PDO::PARAM_BOOL;
			case 'integer':
			case 'double':
				return PDO::PARAM_INT;
			case 'string':
				return PDO::PARAM_STR;
			case 'NULL':
				return PDO::PARAM_NULL;
		}

		throw new Exception('ActiveRecord can not work with type [' . $type . '] of value [' . $value . '], please write own statement.'); 
	}

}

class View {

	use SanitizerTrait;

	private array $layout = ['file' => null, 'data' => null];
	private array $areas;
	private I18n $i18n;

	public function withLayout(string $file, array|ActiveRecord $arrayOrRecord, bool $sanitize = true): self {
		if ($sanitize) {
			$data = $this->sanitizeTemplateData($arrayOrRecord);
		} else {
			$data = $arrayOrRecord;
		}

		$this->layout['file'] = $file;
		$this->layout['data'] = $data;

		return $this;
	}

	public function withArea(string $file, array|ActiveRecord $arrayOrRecord, ?string $areaName = 'main', ?bool $sanitize = true): self {
		if ($sanitize) {
			$data = $this->sanitizeTemplateData($arrayOrRecord);
		} else {
			$data = $arrayOrRecord;
		}

		$this->areas[$areaName]['file'] = $file;
		$this->areas[$areaName]['data'] = $data;

		return $this;
	}

	public function withI18n(I18n $i18n): self {
		$this->i18n = $i18n;

		return $this;
	}

	private function sanitizeTemplateData(array|ActiveRecord $arrayOrRecord): array {
		$data = [];

		if ($arrayOrRecord instanceof ActiveRecord) {
			$data = $arrayOrRecord->getData();
		} elseif (is_array($arrayOrRecord)) {
			$data = $arrayOrRecord;
		} else {
			throw new Exception('Template data must be an array or instance of "ActiveRecord".');
		}

		foreach ($data as $dataKey => $item) {
			if ($item instanceof ActiveRecord) {
				$sanitizedRecordData = $this->sanitize($item->getData());
				if (!empty($sanitizedRecordData)) $item->map($sanitizedRecordData);
				$data[$dataKey] = $item;
			} elseif ($item instanceof ArrayObject) {
				foreach ($item as $recordKey => $record) {
					$sanitizedRecordData = $this->sanitize($record->getData());
					if (!empty($sanitizedRecordData)) $record->map($sanitizedRecordData);
					$data[$dataKey][$recordKey] = $record;
				}
			} else {
				$data[$dataKey] = $this->sanitize($item);
			}
		}

		return $data;
	}

	private function area(?string $areaName = 'main') {
		if (!isset($this->areas[$areaName])) return;

		$template = $this->areas[$areaName]['file'];

		if (file_exists($template)) {
			$data = $this->areas[$areaName]['data'];
			if (is_array($data) && count($data) > 0) extract($data);

			include $template;
		} else {
			throw new Exception('Template file "' . $template . '"" not found.');
		}
	}

	private static function getMethodField(string $method = Route::POST) {
		return '<input type="hidden" name="_method" value="' . $method . '" />';
	}

	private static function getCsrfField() {
		Session::start();
		$token = Session::getToken() ?? Session::generateToken();

		return '<input type="hidden" name="_token" value="' . $token . '" />';
	}

	private static function getHoneypotField() {
		return '<input type="checkbox" name="hooman-check" id="hooman-check" aria-hidden="true" tabindex="-1" style="position: absolute; widht: 1px; height: 1px; overflow: hidden;">';
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
		echo $this->i18n->get($key, $fallback, ...$args);
	}

	private function getI18n(string $key, ?string $fallback = null, ...$args) {
		return $this->i18n->get($key, $fallback, ...$args);
	}

	public function renderAreas(): string {
		ob_start();

		foreach ($this->areas as $areaName => $area) {
			$this->area($areaName);
		}

		$this->html = ob_get_contents();
		ob_end_clean();

		return $this->html;
	}

	public function render(): string {
		if (!$this->layout['file'] || !file_exists($this->layout['file'])) {
			return $this->renderAreas();
		}

		ob_start();

		if (is_array($this->layout['data']) && count($this->layout['data']) > 0) extract($this->layout['data']);

		include $this->layout['file'];

		$this->html = ob_get_contents();
		ob_end_clean();

		return $this->html;
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
	private string $name;

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

	public function getName(): string {
		return $this->name;
	}

}

class Router {

	protected string $contextPath;
	private array $locales = [];

	private array $routes = [];

	public function __call(string $name, array $arguments): Route {
		$method = strtoupper($name);
		$uri = $arguments[0];
		$callable = $arguments[1];

		if ($this->contextPath) $uri = '/' . trim($this->contextPath, '/\\') . $uri;

		$this->routes[$method][] = new Route($method, $uri, $callable);
		return end($this->routes[$method]);
	}

	public function findRoute(string $requestedMethod, string $requestedUri): ?Route {
		if (empty($this->routes) || empty($this->routes[$requestedMethod])) return null;

		$route = null;
		foreach ($this->routes[$requestedMethod] as $possibleRoute) {
			$uriPattern = $possibleRoute->getUri();

			// Remove leading and trailing slashes (if present) and add it again.
			$requestedUri = trim($requestedUri, '/\\');
			$uriPattern   = trim($uriPattern,   '/\\');
			$requestedUri = '/' . $requestedUri . '/';
			$uriPattern   = '/' . $uriPattern   . '/';

			$uriPattern = preg_quote($uriPattern);

			if (!empty($this->locales)) {
				// Replace locale patterns with regex.
				$uriPattern = str_replace('/\{locale\}',   '(\/' . implode('|\/', $this->locales) . ')',  $uriPattern, $localeReplaced);
				$uriPattern = str_replace('/\{locale\?\}', '(\/' . implode('|\/', $this->locales) . ')?', $uriPattern, $localeOptionalReplaced);
			}

			// Replace patterns with regex.
			$uriPattern = str_replace('\{any\}',   '([A-Za-z0-9_-]+)',   $uriPattern);
			$uriPattern = str_replace('\{any\?\}', '?([A-Za-z0-9_-]+)?', $uriPattern);
			$uriPattern = str_replace('\{num\}',   '(\d+)',   $uriPattern);
			$uriPattern = str_replace('\{num\?\}', '?(\d+)?', $uriPattern);

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

	private function setContextPath(string $contextPath) {
		$this->contextPath = $contextPath;
	}

	public function setLocales(string ...$locales) {
		$this->locales = $locales;
	}

}

class App extends Router {

	use InterceptorTrait;
	use HeaderTrait;

	private string $host;
	private string $fullUrl;
	private array $queryParams = [];
	private array $parsedBody = [];
	private array $uploadedFiles = [];
	private array $cookieParams = [];
	private string|false|null $body = null;

	private string $method;
	private string $uri;
	private ?Route $route;

	private array $value = [];

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

	public function init() {
		if (getEnv('DEBUG') && getEnv('DEBUG') == 'true') error_reporting(E_ALL);

		set_exception_handler([$this, 'exceptionHandler']);

		$this->contextPath = getenv('APP_CONTEXT_PATH');

		$this->method = $_POST['_method'] ?? $_SERVER['REQUEST_METHOD'] ?? Route::GET;
		$this->uri = $_SERVER['REQUEST_URI'];
		$this->headers = getallheaders();

		$this->host = $_SERVER['HTTP_HOST'];
		$this->fullUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . "://{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}";
		$this->queryParams = $_GET;
		$this->parsedBody = $_POST;
		$this->uploadedFiles = $_FILES;
		$this->cookieParams = $_COOKIE;
		$this->body = file_get_contents('php://input', 'r') ?: null;
	}

	public function exceptionHandler(Throwable $e) {
		$isDebugMode = getEnv('DEBUG') && getEnv('DEBUG') == 'true';
		$result = new Result('<h1>Internal Server Error</h1>', 500, ['Content-Type', 'text/html; charset=utf-8']);

		if (is_int($e->getCode())) {
			$result->setStatus($e->getCode() > 0 ? $e->getCode() : 500);
		}

		if ($result->getStatus() == 404) {
			$result->setBody('<h1>Not Found</h1>');
		} else {
			if ($isDebugMode) {
				$result->appendToBody('<p>' . $e->getMessage() . '</p><p>' . $e->getTraceAsString() . '</p>' . $e);
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

			$result->setBody(
				Result::generateArray(
					Result::ERROR,
					$e->getMessage(),
					$context ?? [],
				)
			);
		}

		$this->render($result);
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

	public function getMethod(): string {
		return $this->method;
	}

	public function getUri(): string {
		return $this->uri;
	}

	public function getRoute(): ?Route {
		return $this->route;
	}

	public function getLocale(): string {
		if (!$this->route) return null;

		return $this->route->getLocale();
	}

	public function setValue(string $name, mixed $value) {
		$this->value[$name] = $value;
	}

	public function getValue(string $name) {
		if (!isset($this->value[$name])) return;

		return $this->value[$name];
	}

	public function run() {
		$route = $this->findRoute($this->method, $this->uri);
		if (!$route) throw new HttpException('Not Found.', 404);
		$this->route = $route;

		if (!$route->usesOnlyRouteInterceptor() && $this->getInterceptorBefore()) ($this->getInterceptorBefore())($this);
		if ($route->getInterceptorBefore()) ($route->getInterceptorBefore())($this);

		$result = ($route->getAction())(...$route->getParameters());
		// @todo Wenn Rückgabe View -> Routen injecten für routeByName, siehe RouteTransporter
		if (!$result instanceof Result) $result = new Result($result);

		if ($route->getInterceptorAfter()) $result = ($route->getInterceptorAfter())($this, $result);
		if (!$route->usesOnlyRouteInterceptor() && $this->getInterceptorAfter()) $result = ($this->getInterceptorAfter())($this, $result);

		$this->render($result);
	}

	public function render(Result $result) {
		$body = $result->getBody();
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

return (function () {
	$app = new App();

	$app->before(new AppBeforeInterceptor());
	$app->after(new AppAfterInterceptor());

	return $app;

	// For use of "index.php" in subfolder, e. g. "./public" but keeping files
	// like ".env" in root "./"
	// chdir(dirname(__DIR__));
	// before `$app = require 'app.php';`
})();
