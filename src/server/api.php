<?php

$app = require 'app.php';

$app->post('mail', function () use ($app) {
	if ($app->getHeader('Content-Type') !== 'application/json') {
		throw new HttpException('Bad request Content-Type.', 400);
	}

	$data = json_decode($app->body);

	if (!$data) throw new HttpException('Bad request body.', 400);

	if (
		!isset($data->name)
		|| !isset($data->email)
		|| !isset($data->message)
	) {
		throw new HttpException('Bad request, one or more parameters are missing.', 400);
	}

	if (
		!trim($data->name)
		|| !trim($data->email)
		|| !trim($data->message)
	) {
		throw new HttpException('Bad request, one or more parameters are empty.', 400);
	}

	$name = trim($data->name);
	$email = trim($data->email);
	$message = trim($data->message);

	if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
		return new Result(Result::generateArray(
			RESULT::INVALID,
			'Bad request, one or more parameters are invalid.',
			['email'],
		), 400);
	}

	$headers = 'From: ' . $name . ' <' . $email . '>';
	$to      = 'website.terminal@bhdzllr.com';
	$subject = 'bhdzllr.com Contact Form';

	$message = $message 
		. "\n\n"
		. 'Name: ' . $name . "\n"
		. 'E-Mail: ' . $email;

	mail($to, $subject, $message, $headers);

	return new Result(Result::generateArray());
})->before(function ($app) {
	Helpers::checkRateLimitCookie($app, 'rate-limit-mail');
})->after(function ($app, $result) {
	Helpers::setRateLimitCookie($result->status, 'rate-limit-mail');

	return $result;
});

$app->get('like&id={any}', function (string $id) {

	// Return likes

	return [$id];
});

$app->post('like&id={any}', function () {

	// Save like

	return [];
})->before(function ($app) {
	Helpers::checkRateLimitCookie($app, 'rate-limit-like');
})->after(function ($app, $result) {
	Helpers::setRateLimitCookie($result->status, 'rate-limit-like', 25);

	return $result;
});

$app->run();
