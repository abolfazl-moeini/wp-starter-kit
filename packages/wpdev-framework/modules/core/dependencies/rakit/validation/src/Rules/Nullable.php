<?php

namespace WPDev\Dependencies\Rakit\Validation\Rules;

use WPDev\Dependencies\Rakit\Validation\Rule;
class Nullable extends Rule
{
    /**
     * Check the $value is valid
     *
     * @param mixed $value
     * @return bool
     */
    public function check($value) : bool
    {
        return \true;
    }
}
