<?php

set_exception_handler(function ($e) {
	return render(Result::generate(
		RESULT::ERROR,
		$e->getMessage(),
		null,
		$e->getCode() == 0 ? 500 : $e->getCode(),
	));
});

main();

function main() {
	if (getMethod() != 'POST' || strpos(getContentType(), 'application/json') === false) {
		throw new Exception('Bad request method or content-type.', 400);
	}

	$json = file_get_contents('php://input');
	$data = json_decode($json);

	if(
		!trim($data->name)
		|| !trim($data->email)
		|| !trim($data->message)
	) {
		throw new Exception('Bad request, one or more parameters are missing.', 400);
	}

	$name = trim($data->name);
	$email = trim($data->email);
	$message = trim($data->message);

	if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
		return render(Result::generate(
			RESULT::INVALID,
			'Bad request, one or more parameters are invalid.',
			['email'],
			400,
		));
	}

	$headers = 'From: ' . $name . ' <' . $email . '>';
	$to      = 'website.terminal@bhdzllr.com';
	$subject = 'bhdzllr.com Contact Form';

	$message = $message 
		. "\n\n"
		. 'Name: ' . $name . "\n"
		. 'E-Mail: ' . $email;

	mail($to, $subject, $message, $headers);

	return render(Result::generate());
}

function getMethod() {
	if (isset($_POST['_method'])) {
		$requestMethod = $_POST['_method'];
	} elseif ($_SERVER['REQUEST_METHOD']) {
		$requestMethod = $_SERVER['REQUEST_METHOD'];
	} else {
		$requestMethod = 'GET';
	}

	return $requestMethod;
}

function getContentType() {
	if ($_SERVER['CONTENT_TYPE']) return $_SERVER['CONTENT_TYPE'];

	return 'text/html';
}

function render(array $result) {
	http_response_code($result['status']);

	header('Content-Type: application/json; charset=utf-8');

	echo json_encode($result);
}

class Result {

	const SUCCESS   = 'success';
	const ERROR     = 'error';
	const INVALID   = 'invalid';

	public static function generate(string $result = RESULT::SUCCESS, ?string $message = null, ?array $context = [], ?int $status = 200) {
		return [
			'status'  => $status,
			'result'  => $result,
			'message' => $message,
			'context' => $context,
		];
	}

}
