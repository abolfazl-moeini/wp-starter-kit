<?php

/**
 * BCMath Emulation Class
 *
 * PHP version 5 and 7
 *
 * @author    Jim Wigginton <terrafrost@php.net>
 * @copyright 2019 Jim Wigginton
 * @license   http://www.opensource.org/licenses/mit-license.html  MIT License
 */

namespace bcmath_compat;

use phpseclib3\Math\BigInteger;

/**
 * BCMath Emulation Class
 *
 * @author  Jim Wigginton <terrafrost@php.net>
 * @access  public
 */
abstract class BCMath
{
    /**
     * Default scale parameter for all bc math functions
     */
    private static $scale;

    /**
     * Formats numbers
     *
     * Places the decimal place at the appropriate place, adds trailing 0's as appropriate, etc
     *
     * @var string $x
     * @var int $scale
     * @var int $pad
     * @var boolean $trim
     */
    private static function format($x, $scale, $pad)
    {
        $sign = self::isNegative($x) ? '-' : '';
        $x = str_replace('-', '', $x);

        if (strlen($x) != $pad) {
            $x = str_pad($x, $pad, '0', STR_PAD_LEFT);
        }
        $temp = $pad ? substr_replace($x, '.', -$pad, 0) : $x;
        $temp = explode('.', $temp);
        if ($temp[0] == '') {
            $temp[0] = '0';
        }
        if (isset($temp[1])) {
            $temp[1] = substr($temp[1], 0, $scale);
            $temp[1] = str_pad($temp[1], $scale, '0');
        } elseif ($scale) {
            $temp[1] = str_repeat('0', $scale);
        }
        $result = rtrim(implode('.', $temp), '.');
        if ($sign == '-' && preg_match('#^0\.?0*$#', $result)) {
            $sign = '';
        }
        return $sign . $result;
    }

    /**
     * Negativity Test
     *
     * @var BigInteger $x
     */
    private static function isNegative($x)
    {
        return $x->compare(new BigInteger()) < 0;
    }

    /**
     * __callStatic Magic Method
     *
     * @var string $name
     * @var array $arguments
     */
    public static function __callStatic($name, $arguments)
    {
        static $params = [
            'add' => 3,
            'comp' => 3,
            'div' => 3,
            'mod' => 3,
            'mul' => 3,
            'pow' => 3,
            'powmod' => 4,
            'scale' => 1,
            'sqrt' => 2,
            'sub' => 3
        ];
        if (count($arguments) < $params[$name] - 1) {
            $min = $params[$name] - 1;
            throw new \ArgumentCountError("bc$name() expects at least $min parameters, " . func_num_args() . " given");
        }
        if (count($arguments) > $params[$name]) {
            $str = "bc$name() expects at most {$params[$name]} parameters, " . func_num_args() . " given";
            throw new \ArgumentCountError($str);
        }
        $numbers = array_slice($arguments, 0, $params[$name] - 1);

        $ints = [];
        switch ($name) {
            case 'pow':
                $ints = array_slice($numbers, count($numbers) - 1);
                $numbers = array_slice($numbers, 0, count($numbers) - 1);
                $names = ['exponent'];
                break;
            case 'powmod':
                $ints = $numbers;
                $numbers = [];
                $names = ['base', 'exponent', 'modulus'];
                break;
            case 'sqrt':
                $names = ['num'];
                break;
            default:
                $names = ['num1', 'num2'];
        }
        foreach ($ints as $i => &$int) {
            if (!is_numeric($int)) {
                $int = '0';
            }
            $pos = strpos($int, '.');
            if ($pos !== false) {
                $int = substr($int, 0, $pos);
                throw new \ValueError("bc$name(): Argument #2 (\$$names[$i]) cannot have a fractional part");
            }
        }
        foreach ($numbers as $i => $arg) {
            $num = $i + 1;
            switch (true) {
                case is_bool($arg):
                case is_numeric($arg):
                case is_string($arg):
                case is_object($arg) && method_exists($arg, '__toString'):
                    if (!is_bool($arg) && !is_numeric("$arg")) {
                        throw new \ValueError("bc$name: bcmath function argument is not well-formed");
                    }
                    break;
                // PHP >= 8.1 has deprecated the passing of nulls to string parameters
                case is_null($arg):
                    $error = "bc$name(): Passing null to parameter #$num (\$$names[$i]) of type string is deprecated";
                    trigger_error($error, E_USER_DEPRECATED);
                    break;
                default:
                    $type = is_object($arg) ? get_class($arg) : gettype($arg);
                    $error = "bc$name(): Argument #$num (\$$names[$i]) must be of type string, $type given";
                    throw new \TypeError($error);
            }
        }
        if (!isset(self::$scale)) {
            $scale = ini_get('bcmath.scale');
            self::$scale = $scale !== false ? max(intval($scale), 0) : 0;
        }
        $scale = isset($arguments[$params[$name] - 1]) ? $arguments[$params[$name] - 1] : self::$scale;
        switch (true) {
            case is_bool($scale):
            case is_numeric($scale):
            case is_string($scale) && preg_match('#0-9\.#', $scale[0]):
                break;
            default:
                $type = is_object($arg) ? get_class($arg) : gettype($arg);
                $str = "bc$name(): Argument #$params[$name] (\$scale) must be of type ?int, string given";
                throw new \TypeError($str);
        }
        $scale = (int) $scale;
        if ($scale < 0) {
            throw new \ValueError("bc$name(): Argument #$params[$name] (\$scale) must be between 0 and 2147483647");
        }

        $pad = 0;
        foreach ($numbers as &$num) {
            if (is_bool($num)) {
                $num = $num ? '1' : '0';
            } elseif (!is_numeric($num)) {
                $num = '0';
            }
            $num = explode('.', $num);
            if (isset($num[1])) {
                $pad = max($pad, strlen($num[1]));
            }
        }
        switch ($name) {
            case 'add':
            case 'sub':
            case 'mul':
            case 'div':
            case 'mod':
            case 'pow':
                foreach ($numbers as &$num) {
                    if (!isset($num[1])) {
                        $num[1] = '';
                    }
                    $num[1] = str_pad($num[1], $pad, '0');
                    $num = new BigInteger($num[0] . $num[1]);
                }
                break;
            case 'comp':
                foreach ($numbers as &$num) {
                    if (!isset($num[1])) {
                        $num[1] = '';
                    }
                    $num[1] = str_pad($num[1], $pad, '0');
                }
                break;
            case 'sqrt':
                $numbers = [$arguments[0]];
        }

        $arguments = array_merge($numbers, $ints, [$scale, $pad]);
        return call_user_func_array('self::' . $name, $arguments);
    }
}
