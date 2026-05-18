-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Server version:               9.7.0 - MySQL Community Server - GPL
-- Server OS:                    Win64
-- HeidiSQL Version:             12.17.0.7270
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Dumping database structure for backend_mind
CREATE DATABASE IF NOT EXISTS `backend_mind` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `backend_mind`;

-- Dumping structure for table backend_mind.atlas_drive
CREATE TABLE IF NOT EXISTS `atlas_drive` (
  `nome_original` varchar(255) DEFAULT NULL,
  `dono_id` int DEFAULT NULL,
  `tipo` varchar(255) DEFAULT NULL,
  `caminho` varchar(255) DEFAULT NULL,
  `tamanho` varchar(255) DEFAULT NULL,
  `unique_uuid` varchar(255) DEFAULT NULL,
  UNIQUE KEY `unique_uuid` (`unique_uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table backend_mind.seeds_2fa
CREATE TABLE IF NOT EXISTS `seeds_2fa` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `seed` varchar(255) NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table backend_mind.sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `dono_id` int NOT NULL,
  `revogado` binary(50) DEFAULT '0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0',
  `criado` timestamp NULL DEFAULT (now()),
  `expira` timestamp NULL DEFAULT (now()),
  `RTF_1` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `RTF_1_createdAt` timestamp NULL DEFAULT (now()),
  `RTF_2` varchar(255) DEFAULT NULL,
  `RTF_2_createdAt` timestamp NULL DEFAULT (now()),
  `RTF_1_expireAt` timestamp NULL DEFAULT (now()),
  `RTF_2_expireAt` timestamp NULL DEFAULT (now()),
  PRIMARY KEY (`dono_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='sessões dos usuarios e suas chaves e dados sobre seu atual estado de LOGIN\r\n\r\nrefreshToken\r\nacessToken, dados úteis sobre tal.';

-- Data exporting was unselected.

-- Dumping structure for table backend_mind.usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `totp` varchar(10) NOT NULL DEFAULT '0',
  `nome_completo` varchar(255) DEFAULT NULL,
  `user` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `senha_hash` varchar(255) DEFAULT NULL,
  `senha_hash_vault` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `obs` varchar(255) DEFAULT NULL,
  `DATA` timestamp NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user` (`user`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table backend_mind.usuarios_pendentes
CREATE TABLE IF NOT EXISTS `usuarios_pendentes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome_completo` varchar(255) DEFAULT NULL,
  `user` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `senha_hash` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `obs` varchar(255) DEFAULT NULL,
  `DATA` timestamp NULL DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data exporting was unselected.

-- Dumping structure for table backend_mind.vaults
CREATE TABLE IF NOT EXISTS `vaults` (
  `dono_id` int DEFAULT NULL,
  `nome_vault` varchar(255) DEFAULT NULL,
  `TIMESTAMP` timestamp NULL DEFAULT (now())
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='id de quem é dono\r\ncaminho dos vaults\r\ne seus nomes';

-- Data exporting was unselected.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
