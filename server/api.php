<?php

use App\Helpers;

$app = require 'app.php';
require 'env.php'; // Using PHP because of shared host
$app->init(); // Reinitialize env properties

$config = [
	'storageLikes' => getenv('STORAGE_LIKES'),
];

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

$app->get('like&id={any}', function (string $id) use ($config) {
	if (!file_exists($config['storageLikes'])) throw new Exception('Problem while reading storage.');

	$data = json_decode(file_get_contents($config['storageLikes']));

	foreach ($data as $like) {
		if ($like->id == $id) return $like;
	}

	return new \stdClass();
});

$app->post('like&id={any}', function (string $id) use ($config) {
	if (!file_exists($config['storageLikes'])) throw new Exception('Problem while reading from likes storage.');

	$data = json_decode(file_get_contents($config['storageLikes'])) ?? [];
	$found = false;
	$returnRecord = new \stdClass();

	foreach ($data as $key => $like) {
		if ($like->id == $id) {
			$like->likes++;
			$found = true;
			$returnRecord = $like;
			break;
		}
	}

	if (!$found) {
		$data[] = [
			'id' => $id,
			'likes' => 1,
		];
		$returnRecord = end($data);
	}

	$isFileWritten = file_put_contents($config['storageLikes'], json_encode($data));
	if (!$isFileWritten) throw new Exception('Problem while writing to likes storage.');

	return $returnRecord;
})->before(function ($app) {
	// Helpers::checkRateLimitCookie($app, 'rate-limit-like');
})->after(function ($app, $result) {
	// Helpers::setRateLimitCookie($result->status, 'rate-limit-like', 25);

	return $result;
});

$app->run();
