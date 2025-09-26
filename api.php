<?php

header('Content-Type: application/json');
session_start();

$host = 'localhost';
$db   = 'filmosfera';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Błąd połączenia z bazą danych',
    ]);
    exit;
}

$scriptName = $_SERVER['SCRIPT_NAME'];
$requestUri = $_SERVER['REQUEST_URI'];
$path = substr($requestUri, strlen($scriptName));

switch ($path) {
    case '/api/login':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $login = $input['login'];
            $password = $input['password'];

            $stmt = $pdo->prepare('SELECT * FROM users WHERE login = :login LIMIT 1');
            $stmt->execute(['login' => $login]);
            $user = $stmt->fetch();

            if ($user && password_verify($password, $user['password'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_login'] = $user['login'];
                echo json_encode([
                    'success' => true,
                    'message' => 'Logowanie udane',
                    'user' => ['id' => $user['id'], 'login' => $user['login']]
                ]);
            } else {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'message' => 'Nieprawidłowy login lub hasło'
                ]);
            }
        }
        break;

    case '/api/register':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $login = $input['login'];
            $password = password_hash($input['password'], PASSWORD_DEFAULT);
            $email = $input['email'];

            try {
                $stmt = $pdo->prepare('INSERT INTO users (login, password, email) VALUES (:login, :password, :email)');
                $stmt->execute(['login' => $login, 'password' => $password, 'email' => $email]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Rejestracja udana'
                ]);
            } catch (PDOException $e) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Użytkownik już istnieje'
                ]);
            }
        }
        break;

    case '/api/logout':
        session_destroy();
        echo json_encode([
            'success' => true,
            'message' => 'Wylogowano'
        ]);
        break;

    case '/api/movies':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $stmt = $pdo->query('SELECT m.*, u.login as author FROM movies m LEFT JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC');
            $movies = $stmt->fetchAll();
            echo json_encode([
                'success' => true,
                'movies' => $movies
            ]);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!isset($_SESSION['user_id'])) {
                http_response_code(401);
                echo json_encode(['success' => false, 'message' => 'Nie jesteś zalogowany']);
                break;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            $title = $input['title'];
            $description = $input['description'];
            $imagePath = $input['image_path'] ?? '';

            $stmt = $pdo->prepare('INSERT INTO movies (title, description, image_path, user_id) VALUES (:title, :description, :image_path, :user_id)');
            $stmt->execute([
                'title' => $title,
                'description' => $description,
                'image_path' => $imagePath,
                'user_id' => $_SESSION['user_id']
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Film dodany pomyślnie'
            ]);
        }
        break;

    case '/api/movie':
        if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
            $stmt = $pdo->prepare('SELECT m.*, u.login as author FROM movies m LEFT JOIN users u ON m.user_id = u.id WHERE m.id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $movie = $stmt->fetch();

            if ($movie) {
                echo json_encode([
                    'success' => true,
                    'movie' => $movie
                ]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Film nie znaleziony'
                ]);
            }
        }
        break;

    case '/api/user-movies':
        if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_SESSION['user_id'])) {
            $stmt = $pdo->prepare('SELECT * FROM movies WHERE user_id = :user_id ORDER BY created_at DESC');
            $stmt->execute(['user_id' => $_SESSION['user_id']]);
            $movies = $stmt->fetchAll();
            echo json_encode([
                'success' => true,
                'movies' => $movies
            ]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Endpoint nie znaleziony'
        ]);
        break;
}
?>